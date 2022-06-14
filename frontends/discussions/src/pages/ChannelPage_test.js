// @flow
/* global SETTINGS */
import { assert } from "chai"
import sinon from "sinon"
import R from "ramda"

import PostList from "../components/PostList"
import { NotFound, NotAuthorized } from "../components/ErrorPages"
import ChannelPage, { ChannelPage as InnerChannelPage } from "./ChannelPage"

import { makeChannelList } from "../factories/channels"
import { makeChannelPostList } from "../factories/posts"
import { makeWidgetListResponse } from "../factories/widgets"
import { actions } from "../actions"
import { FORM_END_EDIT } from "../actions/forms"
import { SET_POST_DATA } from "../actions/post"
import { SET_CHANNEL_DATA } from "../actions/channel"
import { EVICT_POSTS_FOR_CHANNEL } from "../actions/posts_for_channel"
import IntegrationTestHelper from "../util/integration_test_helper"
import { channelURL } from "../lib/url"
import { formatTitle } from "../lib/title"
import { POSTS_SORT_HOT, VALID_POST_SORT_TYPES } from "../lib/picker"
import { makeReportRecord } from "../factories/reports"
import * as embedLib from "../lib/embed"

describe("ChannelPage", function() {
  this.timeout(10000)

  let helper,
    render,
    channels,
    currentChannel,
    otherChannel,
    postList,
    postIds,
    ensureTwitterStub

  beforeEach(() => {
    channels = makeChannelList(10)
    currentChannel = channels[3]
    otherChannel = channels[4]
    postList = makeChannelPostList()
    postIds = postList.map(post => post.id)
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(currentChannel))
    helper.getChannelsStub.returns(Promise.resolve(channels))
    helper.getPostsForChannelStub.returns(Promise.resolve({ posts: postList }))
    helper.getReportsStub.returns(Promise.resolve(R.times(makeReportRecord, 4)))
    helper.getProfileStub.returns(Promise.resolve(""))
    helper.getWidgetListStub.returns(Promise.resolve(makeWidgetListResponse(0)))
    render = helper.configureHOCRenderer(
      ChannelPage,
      InnerChannelPage,
      {
        posts: {
          data:       new Map(postList.map(post => [post.id, post])),
          processing: false,
          loaded:     true
        },
        postsForChannel: {
          data:       new Map([[currentChannel.name, { postIds: postIds }]]),
          processing: false,
          loaded:     true
        },
        channels: {
          data:       new Map(channels.map(channel => [channel.name, channel])),
          processing: false,
          loaded:     true
        },
        reports: {
          data:       {},
          processing: false,
          loaded:     true
        },
        subscribedChannels: {
          data:       channels.map(channel => channel.name),
          processing: false,
          loaded:     true
        },
        ui: {
          dialogs: new Map()
        },
        focus: {},
        forms: {}
      },
      {
        channelName: currentChannel.name,
        location:    {
          search:   {},
          pathname: channelURL(currentChannel.name)
        },
        history: helper.browserHistory
      }
    )
    ensureTwitterStub = helper.sandbox.stub(embedLib, "ensureTwitterEmbedJS")
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("integration", () => {
    let renderComponent, listenForActions

    beforeEach(() => {
      renderComponent = helper.renderComponent.bind(helper)
      listenForActions = helper.listenForActions.bind(helper)
    })

    const renderPage = async channel => {
      const [wrapper] = await renderComponent(channelURL(channel.name), [
        actions.profiles.get.requestType,
        actions.profiles.get.successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.postsForChannel.get.requestType,
        actions.postsForChannel.get.successType,
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        actions.widgets.get.requestType,
        actions.widgets.get.successType,
        SET_POST_DATA,
        SET_CHANNEL_DATA
      ])
      return wrapper.update()
    }

    it("should set the document title", async () => {
      await renderPage(currentChannel)
      assert.equal(document.title, formatTitle(currentChannel.title))
    })

    it("should fetch postsForChannel, set post data, and render", async () => {
      const wrapper = await renderPage(currentChannel)
      assert.deepEqual(wrapper.find(PostList).props().posts, postList)
    })

    it("updates requirements when channel name changes", async () => {
      await renderPage(currentChannel)
      sinon.assert.neverCalledWith(helper.getChannelStub, otherChannel.name)
      await listenForActions(
        [
          actions.channels.get.requestType,
          actions.channels.get.successType,
          actions.postsForChannel.get.requestType,
          actions.postsForChannel.get.successType,
          actions.widgets.get.requestType,
          actions.widgets.get.successType,
          EVICT_POSTS_FOR_CHANNEL,
          FORM_END_EDIT // this is because of WidgetListContainer
        ],
        () => {
          helper.browserHistory.push(channelURL(otherChannel.name))
        }
      )
      sinon.assert.calledWith(helper.getChannelStub, otherChannel.name)
    })
  })

  describe("sorting", () => {
    it("uses hot sorting by default", async () => {
      const { inner } = await render()
      assert.equal(inner.find("PostSortPicker").props().value, POSTS_SORT_HOT)
    })

    it("uses the query parameter to set the sort", async () => {
      const { inner } = await render(
        {},
        {
          location: {
            search: "?sort=some_sort"
          }
        }
      )
      assert.equal(inner.find("PostSortPicker").props().value, "some_sort")
    })

    it("should switch the sorting method when an option is selected", async () => {
      const { inner } = await render()
      for (const sortType of VALID_POST_SORT_TYPES) {
        inner
          .find("PostSortPicker")
          .props()
          .updatePickerParam(sortType, {
            preventDefault: helper.sandbox.stub()
          })

        assert.equal(helper.currentLocation.search, `?sort=${sortType}`)
      }
    })
  })

  it("should call the ensure twitter function", async () => {
    await render()
    sinon.assert.called(ensureTwitterStub)
  })

  it("should handle missing data gracefully", async () => {
    const { inner } = await render(
      {},
      {
        channelName:
          "somenamethatshouldnevercollidebecauseitsaridiculouslylongvalue"
      }
    )
    assert.lengthOf(inner.find("PostLoading"), 1)
  })

  it("should clear the error if present on load", async () => {
    const { store } = await render(
      {},
      {
        type:    actions.channels.get.failureType,
        payload: {
          error: "some error"
        }
      }
    )

    assert.isUndefined(store.getState().channels.error)
  })

  it("should show a 404 if the channel is not found", async () => {
    const { inner } = await render({
      channels: {
        error: {
          errorStatusCode: 404
        }
      }
    })
    assert(inner.find(NotFound).exists())
  })

  it("should show an 'unauthorized' if the user is not authorized", async () => {
    const { inner } = await render({
      channels: {
        error: {
          errorStatusCode: 403
        }
      }
    })
    assert(inner.find(NotAuthorized).exists())
  })

  it("should show a normal error for other error codes", async () => {
    const { inner } = await render({
      channels: {
        error: {
          errorStatusCode: 500
        }
      }
    })
    assert.isFalse(inner.find(NotFound).exists())
    assert.include(inner.find(".errored").text(), "Error loading page")
  })

  //
  ;[true, false].forEach(loaded => {
    it(`sets canLoadMore=${String(loaded)} when loaded=${String(
      loaded
    )}`, async () => {
      const { inner } = await render({
        postsForChannel: {
          processing: !loaded,
          loaded:     loaded
        }
      })
      assert.equal(inner.props().canLoadMore, loaded)
    })
  })

  it("sets props used by withPostList", async () => {
    const { inner } = await render()

    assert.isTrue(inner.props().showPinUI)
    assert.isTrue(inner.props().showReportPost)
    assert.isTrue(inner.props().showRemovePost)
    assert.isTrue(inner.props().showDeletePost)
    assert.isTrue(inner.props().showTogglePinPost)
    assert.isFalse(inner.props().showChannelLinks)
  })

  it("sets isModerator based on the channel", async () => {
    const { inner } = await render()
    assert.equal(currentChannel.user_is_moderator, inner.props().isModerator)
  })

  it("defines loadMore to fetch from postsForChannel", async () => {
    const { inner, store } = await render()
    const search = { sort: "hot" }
    await inner.props().loadPosts(search)
    sinon.assert.calledWith(
      helper.getPostsForChannelStub,
      currentChannel.name,
      search
    )
    assert.deepEqual(store.getActions()[store.getActions().length - 1], {
      type:    SET_POST_DATA,
      payload: postList
    })
  })
})

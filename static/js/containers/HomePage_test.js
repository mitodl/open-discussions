// @flow
import { assert } from "chai"
import sinon from "sinon"

import PostList from "../components/PostList"
import HomePage, { HomePage as InnerHomePage } from "./HomePage"

import { makeChannelList } from "../factories/channels"
import { makeChannelPostList } from "../factories/posts"
import { actions } from "../actions"
import { SET_CHANNEL_DATA } from "../actions/channel"
import { SET_POST_DATA } from "../actions/post"
import { POSTS_SORT_HOT, VALID_POST_SORT_TYPES } from "../lib/sorting"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("HomePage", () => {
  let helper, render, postList, postIds, channels

  beforeEach(() => {
    channels = makeChannelList()
    postList = makeChannelPostList()
    postIds = postList.map(post => post.id)
    helper = new IntegrationTestHelper()
    helper.getFrontpageStub.returns(Promise.resolve({ posts: postList }))
    helper.getChannelsStub.returns(Promise.resolve(channels))
    helper.getProfileStub.returns(Promise.resolve(""))
    render = helper.configureHOCRenderer(
      HomePage,
      InnerHomePage,
      {
        frontpage: {
          data: {
            pagination: null,
            postIds:    postIds
          },
          processing: false
        },
        posts: {
          data:       new Map(postList.map(post => [post.id, post])),
          processing: false
        },
        channels: {
          data:       new Map(channels.map(channel => [channel.name, channel])),
          processing: false
        },
        reports: {
          data:       {},
          processing: false
        },
        subscribedChannels: {
          data:       channels.map(channel => channel.name),
          processing: false
        },
        ui: {
          dialogs: new Map()
        },
        focus: {},
        forms: {}
      },
      {
        match: {
          params: {}
        },
        location: {
          search:   {},
          pathname: "/"
        },
        history: helper.browserHistory
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("integration", () => {
    let renderComponent

    beforeEach(() => {
      renderComponent = helper.renderComponent.bind(helper)
    })

    const renderPage = async () => {
      const [wrapper] = await renderComponent("/", [
        actions.frontpage.get.requestType,
        actions.frontpage.get.successType,
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        SET_POST_DATA,
        SET_CHANNEL_DATA
      ])
      return wrapper.update()
    }

    it("should fetch frontpage, set post data, render", async () => {
      const wrapper = await renderPage()
      assert.deepEqual(wrapper.find(PostList).props().posts, postList)
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
          .updateSortParam(sortType, {
            preventDefault: helper.sandbox.stub()
          })

        assert.equal(helper.currentLocation.search, `?sort=${sortType}`)
      }
    })
  })
  ;[
    [true, makeChannelPostList(), true],
    [true, [], false],
    [false, makeChannelPostList(), true],
    [false, [], true]
  ].forEach(([processing, posts, expectedLoaded]) => {
    it(`sets loaded to ${String(expectedLoaded)} when there are ${
      posts.length
    } posts and API request processing=${String(processing)}`, async () => {
      const { wrapper } = await render({
        frontpage: {
          processing: processing,
          loaded:     !processing,
          data:       {
            postIds:    posts.map(post => post.id),
            pagination: null
          }
        }
      })
      assert.equal(wrapper.props().loaded, expectedLoaded)
    })
  })
  ;[true, false].forEach(loaded => {
    it(`sets canLoadMore=${String(loaded)} when loaded=${String(
      loaded
    )}`, async () => {
      const { wrapper } = await render({
        frontpage: {
          processing: !loaded,
          loaded:     loaded
        }
      })
      assert.equal(wrapper.props().canLoadMore, loaded)
    })
  })

  it("sets props used by withPostList", async () => {
    const { wrapper } = await render()

    const props = wrapper.props()
    assert.isFalse(props.showPinUI)
    assert.isTrue(props.showReportPost)
    assert.isFalse(props.showRemovePost)
    assert.isFalse(props.showTogglePinPost)
    assert.isTrue(props.showChannelLinks)
    assert.isFalse(props.isModerator)
  })

  it("defines loadMore to fetch from postsForChannel", async () => {
    const { wrapper, store } = await render()
    const search = { sort: "hot" }
    await wrapper.props().loadPosts(search)
    sinon.assert.calledWith(helper.getFrontpageStub, search)
    assert.deepEqual(store.getActions()[store.getActions().length - 1], {
      type:    SET_POST_DATA,
      payload: postList
    })
  })
})

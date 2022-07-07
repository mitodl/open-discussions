// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"

import LiveStream from "../components/LiveStream"
import PostList from "../components/PostList"
import HomePage, {
  HomePage as InnerHomePage,
  mapStateToProps
} from "./HomePage"
import NewCoursesWidget from "../components/NewCoursesWidget"

import { makeChannelList } from "../factories/channels"
import { makeChannelPostList } from "../factories/posts"
import { SET_POST_DATA } from "../actions/post"
import { POSTS_SORT_HOT, VALID_POST_SORT_TYPES } from "../lib/picker"
import IntegrationTestHelper from "../util/integration_test_helper"
import { shouldIf, mockCourseAPIMethods } from "../lib/test_utils"

describe("HomePage", () => {
  let helper, render, postList, postIds, channels, state, ownProps

  beforeEach(() => {
    channels = makeChannelList()
    postList = makeChannelPostList()
    postIds = postList.map(post => post.id)
    helper = new IntegrationTestHelper()
    helper.getFrontpageStub.returns(Promise.resolve({ posts: postList }))
    helper.getChannelsStub.returns(Promise.resolve(channels))
    helper.getProfileStub.returns(Promise.resolve(""))
    helper.getLivestreamEventsStub.returns(Promise.resolve({ data: [] }))
    state = {
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
    }
    ownProps = {
      match: {
        params: {}
      },
      location: {
        search:   {},
        pathname: "/"
      },
      history: helper.browserHistory
    }
    render = helper.configureHOCRenderer(
      HomePage,
      InnerHomePage,
      state,
      ownProps
    )
  })

  afterEach(() => {
    // turn off the unmount b/c of redux-query
    helper.cleanup(false)
  })

  describe("integration", () => {
    beforeEach(() => {
      mockCourseAPIMethods(helper)
    })

    it("should fetch frontpage, set post data, render", async () => {
      const { wrapper } = await render()
      assert.deepEqual(wrapper.find(PostList).props().posts, postList)
    })

    it("should render a livestream component", async () => {
      const { wrapper } = await render()
      assert.ok(wrapper.find(LiveStream).exists())
    })

    //
    ;[true, false].forEach(courseUIEnabled => {
      it(`${shouldIf(
        courseUIEnabled
      )} render a new courses widget when course_ui_enabled === ${String(
        courseUIEnabled
      )}`, async () => {
        SETTINGS.course_ui_enabled = courseUIEnabled
        const { wrapper } = await render()
        assert.equal(courseUIEnabled, wrapper.find(NewCoursesWidget).exists())
      })
    })
  })

  describe("sorting", () => {
    it("uses hot sorting by default", async () => {
      const { wrapper } = await render()
      assert.equal(wrapper.find("PostSortPicker").props().value, POSTS_SORT_HOT)
    })

    it("uses the query parameter to set the sort", async () => {
      const { wrapper } = await render(
        {},
        {
          location: {
            search: "?sort=some_sort"
          }
        }
      )
      assert.equal(wrapper.find("PostSortPicker").props().value, "some_sort")
    })

    it("should switch the sorting method when an option is selected", async () => {
      const { wrapper } = await render()
      for (const sortType of VALID_POST_SORT_TYPES) {
        wrapper.find("PostSortPicker").props().updatePickerParam(sortType, {
          preventDefault: helper.sandbox.stub()
        })

        assert.equal(helper.currentLocation.search, `?sort=${sortType}`)
      }
    })
  })

  describe("mapStateToProps", () => {
    //
    [
      [true, makeChannelPostList(), true],
      [true, [], false],
      [false, makeChannelPostList(), true],
      [false, [], true]
    ].forEach(([processing, posts, expectedLoaded]) => {
      it(`sets loaded to ${String(expectedLoaded)} when there are ${
        posts.length
      } posts and API request processing=${String(processing)}`, () => {
        const props = mapStateToProps(
          {
            ...state,
            frontpage: {
              processing: processing,
              loaded:     !processing,
              data:       {
                postIds:    posts.map(post => post.id),
                pagination: null
              }
            }
          },
          ownProps
        )
        assert.equal(props.loaded, expectedLoaded)
      })
    })

    //
    ;[true, false].forEach(loaded => {
      it(`sets canLoadMore=${String(loaded)} when loaded=${String(
        loaded
      )}`, () => {
        const props = mapStateToProps(
          {
            ...state,
            frontpage: {
              processing: !loaded,
              loaded:     loaded,
              data:       {
                pagination: null,
                postIds:    []
              }
            }
          },
          ownProps
        )
        assert.equal(props.canLoadMore, loaded)
      })
    })

    it("sets props used by withPostList", async () => {
      const props = mapStateToProps(state, ownProps)
      assert.isFalse(props.showPinUI)
      assert.isTrue(props.showReportPost)
      assert.isFalse(props.showRemovePost)
      assert.isFalse(props.showTogglePinPost)
      assert.isTrue(props.showChannelLinks)
      assert.isFalse(props.isModerator)
    })
  })

  it("defines loadMore to fetch from postsForChannel", async () => {
    const { inner, store } = await render()
    const search = { sort: "hot" }
    await inner.props().loadPosts(search)
    sinon.assert.calledWith(helper.getFrontpageStub, search)
    assert.deepEqual(store.getActions()[store.getActions().length - 1], {
      type:    SET_POST_DATA,
      payload: postList
    })
  })

  it("renders an intro card", async () => {
    const { wrapper } = await render()
    const introCard = wrapper.find(".home-callout")
    assert.isTrue(introCard.exists())
  })
})

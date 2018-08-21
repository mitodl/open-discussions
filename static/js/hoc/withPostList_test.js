// @flow
import React from "react"
import sinon from "sinon"
import { assert } from "chai"

import {
  makeChannelPostList,
  makePagination,
  makePost
} from "../factories/posts"

import withPostList from "./withPostList"
import IntegrationTestHelper from "../util/integration_test_helper"
import * as apiActions from "../util/api_actions"
import R from "ramda"

class Page extends React.Component<*, *> {
  render() {
    const { renderPosts } = this.props
    return <div>{renderPosts()}</div>
  }
}

const WrappedPage = withPostList(Page)

describe("withPostList", () => {
  let helper, render, postList, loadPosts

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    loadPosts = helper.sandbox.stub()
    postList = makeChannelPostList()
    render = helper.configureHOCRenderer(
      WrappedPage,
      Page,
      {},
      {
        posts:     postList,
        loadPosts: loadPosts,
        location:  { search: {} }
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("pagination", () => {
    [{ sort: "new" }, null].forEach(pagination => {
      it(`has PostList and ${
        pagination ? "" : "no "
      }InfiniteScroll if there is ${
        pagination ? "" : "no "
      }pagination`, async () => {
        const { inner } = await render(
          {},
          {
            pagination
          }
        )
        assert.equal(inner.find("InfiniteScroll").length, pagination ? 1 : 0)
        assert.equal(inner.find("PostList").length, 1)
      })
    })
    ;["after", null].forEach(afterUrl => {
      it(`sets hasMore=${String(!!afterUrl)} if it ${
        afterUrl ? "has" : "doesn't have"
      } an after url`, async () => {
        const { inner } = await render(
          {},
          {
            pagination: {
              sort:  "new",
              after: afterUrl
            }
          }
        )

        assert.equal(inner.find("InfiniteScroll").props().hasMore, !!afterUrl)
      })
    })

    describe("loadMore", () => {
      let pagination

      beforeEach(() => {
        pagination = makePagination()
      })

      it("doesn't do anything if canLoadMore is not set", async () => {
        const { inner } = await render(
          {},
          {
            canLoadMore: false,
            pagination:  pagination
          }
        )
        const props = inner.find("InfiniteScroll").props()
        await props.loadMore()
        sinon.assert.notCalled(loadPosts)
      })
      ;[true, false].forEach(hasParams => {
        it(`${
          hasParams ? "uses" : "doesn't use"
        } query parameters from the URL for the pagination`, async () => {
          const { inner } = await render(
            {},
            {
              canLoadMore: true,
              pagination:  pagination,
              location:    {
                search: hasParams ? "?sort=some_sort&after=different_after" : ""
              }
            }
          )
          const props = inner.find("InfiniteScroll").props()
          await props.loadMore()
          assert.equal(loadPosts.callCount, 1)
          sinon.assert.calledWith(loadPosts, {
            after: pagination.after,
            count: pagination.after_count,
            ...(hasParams ? { sort: "some_sort" } : {})
          })
        })
      })
    })

    describe("PostList", () => {
      it("has posts", async () => {
        const { inner } = await render()
        const props = inner.find("PostList").props()

        assert.deepEqual(props.posts, postList)
      })

      it("toggles an upvote", async () => {
        const post = makePost()
        const innerStub = helper.sandbox.stub()
        const stub = helper.sandbox.stub(apiActions, "toggleUpvote")
        stub.get(() =>
          R.curry(async (dispatch, post) => innerStub(dispatch, post))
        )
        const { inner } = await render()
        const props = inner.find("PostList").props()
        await props.toggleUpvote(post)

        assert.equal(innerStub.callCount, 1)
        assert.equal(innerStub.firstCall.args[1], post)
      })
      ;[
        ["reportPost", "showReportPost"],
        ["removePost", "showRemovePost"]
      ].forEach(([prop, showProp]) => {
        [true, false].forEach(showPropValue => {
          it(`${
            showProp ? "passes" : "doesn't pass"
          } through ${prop} when ${String(showProp)}=${String(
            showPropValue
          )}`, async () => {
            const { inner } = await render(
              {},
              {
                [prop]:     prop,
                [showProp]: showProp
              }
            )
            assert.equal(
              inner.find("PostList").props()[prop],
              showProp ? prop : null
            )
          })
        })
      })
      ;["showPinUI", "showChannelLinks", "isModerator"].forEach(propName => {
        it(`passed through ${propName} to PostList`, async () => {
          const { inner } = await render(
            {},
            {
              [propName]: propName
            }
          )
          assert.equal(inner.find("PostList").props()[propName], propName)
        })
      })

      it("has a prop for pinning the post if showTogglePinPost=false", async () => {
        const { inner } = await render(
          {},
          {
            showTogglePinPost: false
          }
        )
        assert.equal(inner.find("PostList").props().togglePinPost, null)
      })

      it("toggles pinning a post", async () => {
        helper.editPostStub.returns(Promise.resolve(makePost()))
        const { inner } = await render(
          {},
          {
            showTogglePinPost: true
          }
        )
        const post = postList[0]

        inner
          .find("PostList")
          .props()
          .togglePinPost(post)
        assert.equal(helper.editPostStub.callCount, 1)
        sinon.assert.calledWith(helper.editPostStub, post.id, {
          stickied: !post.stickied
        })
      })
    })
  })
})

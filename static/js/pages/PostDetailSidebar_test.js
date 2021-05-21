// @flow
import R from "ramda"
import sinon from "sinon"
import { assert } from "chai"

import { actions } from "../actions"
import PostDetailSidebar, {
  PostDetailSidebar as InnerPostDetailSidebar
} from "./PostDetailSidebar"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makePost } from "../factories/posts"
import { makePostResult } from "../factories/search"

describe("PostDetailSidebar", () => {
  let helper, render, post, relatedPostData

  beforeEach(() => {
    post = makePost()
    relatedPostData = R.times(makePostResult, 4)
    helper = new IntegrationTestHelper()
    helper.getRelatedPostsStub.returns(Promise.resolve(relatedPostData))
    render = helper.configureHOCRenderer(
      PostDetailSidebar,
      InnerPostDetailSidebar,
      {
        relatedPosts: {
          processing: false,
          loaded:     false,
          data:       []
        }
      },
      {
        post: post
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("shows a loading indicator when the related posts request is processing", async () => {
    const { inner } = await render({
      relatedPosts: {
        processing: true,
        loaded:     false,
        data:       []
      }
    })
    assert.isTrue(inner.find("Loading").exists())
  })
  ;[
    [null, "null"],
    [[], "empty"]
  ].forEach(([relatedPostsValue, desc]) => {
    it(`returns null when related post data is ${desc}`, async () => {
      const { inner } = await render({
        relatedPosts: {
          processing: false,
          loaded:     true,
          data:       relatedPostsValue
        }
      })
      assert.isNull(inner.html())
    })
  })

  it("loads a list of related posts", async () => {
    const { store } = await render()
    sinon.assert.calledWith(helper.getRelatedPostsStub, post.id)
    const dispatchedActions = store.getActions()
    assert.deepEqual(dispatchedActions, [
      {
        type:    actions.relatedPosts.post.requestType,
        payload: post.id
      },
      {
        type:    actions.relatedPosts.post.successType,
        payload: relatedPostData
      }
    ])
  })

  it("shows a list of related posts", async () => {
    const { inner } = await render({
      relatedPosts: {
        processing: false,
        loaded:     true,
        data:       relatedPostData
      }
    })
    const allRelated = inner.find(".related-post-item")
    assert.lengthOf(allRelated, relatedPostData.length)
    const firstRelated = allRelated.at(0)
    assert.equal(
      firstRelated
        .find("Link")
        .at(0)
        .prop("children"),
      relatedPostData[0].post_title
    )
  })
})

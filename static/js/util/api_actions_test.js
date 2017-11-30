// @flow
import { assert } from "chai"

import { actions } from "../actions"
import { SET_POST_DATA } from "../actions/post"
import { toggleUpvote, approvePost, removePost } from "../util/api_actions"
import IntegrationTestHelper from "../util/integration_test_helper"

import { makePost } from "../factories/posts"

describe("api_actions util", () => {
  let helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("toggleUpvote", () => {
    beforeEach(() => {
      helper.updateUpvoteStub.returns(Promise.resolve(makePost))
    })

    for (const value of [true, false]) {
      it(`should set invert the upvoted value for upvoted:${value.toString()}`, async () => {
        const { requestType, successType } = actions.postUpvotes.patch
        const post = makePost()
        post.upvoted = value
        await helper.listenForActions([requestType, successType], () => {
          toggleUpvote(helper.store.dispatch, post)
        })

        assert.isOk(helper.updateUpvoteStub.calledWith(post.id, !value))
      })
    }
  })

  describe("approvePost", () => {
    let post
    beforeEach(() => {
      post = makePost()
      helper.updateRemovedStub.returns(Promise.resolve(post))
    })

    it("should patch the post and set the updated value", async () => {
      const postToApprove = makePost()
      postToApprove.id = post.id
      const { requestType, successType } = actions.postRemoved.patch
      const state = await helper.listenForActions(
        [requestType, successType, SET_POST_DATA],
        () => {
          approvePost(helper.store.dispatch, postToApprove)
        }
      )
      assert.deepEqual(state.posts.data.get(post.id), post)
      assert.isOk(helper.updateRemovedStub.calledWith(post.id, false))
    })
  })

  describe("removePost", () => {
    let post
    beforeEach(() => {
      post = makePost()
      helper.updateRemovedStub.returns(Promise.resolve(post))
    })

    it("should patch the post and set the updated value", async () => {
      const postToRemove = makePost()
      postToRemove.id = post.id
      const { requestType, successType } = actions.postRemoved.patch
      const state = await helper.listenForActions(
        [requestType, successType, SET_POST_DATA],
        () => {
          removePost(helper.store.dispatch, postToRemove)
        }
      )

      assert.deepEqual(state.posts.data.get(post.id), post)
      assert.isOk(helper.updateRemovedStub.calledWith(post.id, true))
    })
  })
})

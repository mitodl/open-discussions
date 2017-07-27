// @flow
import { assert } from "chai"

import { actions } from "../actions"
import { toggleUpvote } from "../util/api_actions"
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
      it(`should set invert the upvoted value for upvoted:${value.toString()}`, () => {
        const { requestType, successType } = actions.postUpvotes.patch
        const post = makePost()
        post.upvoted = value
        return helper
          .listenForActions([requestType, successType], () => {
            toggleUpvote(helper.store.dispatch, post)
          })
          .then(() => {
            assert.isOk(helper.updateUpvoteStub.calledWith(post.id, !value))
          })
      })
    }
  })
})

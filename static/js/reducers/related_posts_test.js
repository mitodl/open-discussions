// @flow
import sinon from "sinon"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { assert } from "chai"
import { makeSearchResponse } from "../factories/search"

describe("search reducers", () => {
  let helper, dispatchThen, response

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    dispatchThen = helper.store.createDispatchThen(state => state.relatedPosts)
    response = makeSearchResponse()
    helper.getRelatedPostsStub.returns(Promise.resolve(response))
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should fetch related post results", async () => {
    const postId = "abc"
    const { data } = await dispatchThen(actions.relatedPosts.post(postId), [
      actions.relatedPosts.post.requestType,
      actions.relatedPosts.post.successType
    ])
    sinon.assert.calledWith(helper.getRelatedPostsStub, postId)
    assert.deepEqual(
      data,
      response.hits.hits.map(item => item._source)
    )
  })
})

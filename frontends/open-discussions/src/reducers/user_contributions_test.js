// @flow
import { assert } from "chai"
import { INITIAL_STATE } from "redux-hammock/constants"
import sinon from "sinon"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { COMMENTS_OBJECT_TYPE, POSTS_OBJECT_TYPE } from "../lib/constants"

import { makeChannelPostList } from "../factories/posts"
import { makeCommentsList } from "../factories/comments"

describe("userContributions reducer", () => {
  const postsResult = makeChannelPostList(),
    commentsResult = makeCommentsList(),
    dummyPagination = { pagination: "params" },
    username = "someuser"

  let helper, store, dispatchThen

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.getUserPostsStub.returns(
      Promise.resolve({
        [POSTS_OBJECT_TYPE]: postsResult,
        pagination:          dummyPagination
      })
    )
    helper.getUserCommentsStub.returns(
      Promise.resolve({
        [COMMENTS_OBJECT_TYPE]: commentsResult,
        pagination:             dummyPagination
      })
    )
    store = helper.store
    dispatchThen = store.createDispatchThen(state => state.userContributions)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should have some initial state", () => {
    assert.deepEqual(store.getState().userContributions, {
      ...INITIAL_STATE,
      data: new Map()
    })
  })
  ;[
    [POSTS_OBJECT_TYPE, postsResult, "getUserPostsStub"],
    [COMMENTS_OBJECT_TYPE, commentsResult, "getUserCommentsStub"]
  ].forEach(([objType, expResultArray, expStubCalled]) => {
    it(`should be able to fetch ${objType} and correctly manage the endpoint state`, async () => {
      const { requestType, successType } = actions.userContributions.get
      const { data } = await dispatchThen(
        actions.userContributions.get(objType, username, dummyPagination),
        [requestType, successType]
      )
      const userContribution = data.get(username)[objType]
      assert.isTrue(userContribution.loaded)
      assert.deepEqual(userContribution.pagination, dummyPagination)
      assert.isArray(userContribution.data)
      assert.deepEqual(userContribution.data, expResultArray)
      sinon.assert.calledOnce(helper[expStubCalled])
    })
  })

  it("should pass an empty object to the API method by default for pagination params", async () => {
    const { requestType, successType } = actions.userContributions.get
    await dispatchThen(
      actions.userContributions.get(POSTS_OBJECT_TYPE, username),
      [requestType, successType]
    )
    sinon.assert.calledWith(helper.getUserPostsStub, username, {})
  })

  it("should append new results to existing endpoint data", async () => {
    const { requestType, successType } = actions.userContributions.get
    await dispatchThen(
      actions.userContributions.get(POSTS_OBJECT_TYPE, username),
      [requestType, successType]
    )

    const newPostsResult = [...postsResult]
    const newPagination = { new: "pagination" }
    helper.getUserPostsStub.returns(
      Promise.resolve({
        [POSTS_OBJECT_TYPE]: newPostsResult,
        pagination:          newPagination
      })
    )
    const { data } = await dispatchThen(
      actions.userContributions.get(POSTS_OBJECT_TYPE, username),
      [requestType, successType]
    )

    const userContribution = data.get(username)[POSTS_OBJECT_TYPE]
    assert.equal(
      userContribution.data.length,
      postsResult.length + newPostsResult.length
    )
    assert.deepEqual(userContribution.pagination, newPagination)
  })
})

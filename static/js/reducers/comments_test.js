// @flow
import { assert } from "chai"
import sinon from "sinon"
import { INITIAL_STATE, FETCH_SUCCESS } from "redux-hammock/constants"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makePost } from "../factories/posts"
import { makeCommentTree } from "../factories/comments"

describe("comments reducers", () => {
  let helper, store, dispatchThen, listenForActions, post, tree

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    post = makePost()
    tree = makeCommentTree(post)
    dispatchThen = helper.store.createDispatchThen(state => state.comments)
    listenForActions = helper.store.createListenForActions(
      state => state.comments
    )
    helper.getCommentsStub.returns(
      Promise.resolve({ data: tree, postID: post.id })
    )
    helper.createCommentStub.resetBehavior()
    helper.createCommentStub.callsFake((postId, text) =>
      Promise.resolve({
        post_id: postId,
        text
      })
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should have some initial state", () => {
    assert.deepEqual(store.getState().comments, {
      ...INITIAL_STATE,
      data: new Map()
    })
  })

  it("should let you get the comments for a Post", () => {
    const { requestType, successType } = actions.comments.get
    return dispatchThen(actions.comments.get(post), [
      requestType,
      successType
    ]).then(({ data }) => {
      let comments = data.get(post.id)
      assert.isArray(comments)
      assert.isNotEmpty(comments[0].replies)
    })
  })

  it("should handle an empty response ok", () => {
    const { requestType, successType } = actions.comments.get
    helper.getCommentsStub.returns(
      Promise.resolve({ data: [], postID: post.id })
    )
    return dispatchThen(actions.comments.get(post), [
      requestType,
      successType
    ]).then(({ data }) => {
      assert.deepEqual([], data.get(post.id))
    })
  })

  it("should let you reply to a post", () => {
    const { requestType, successType } = actions.comments.post
    return listenForActions(
      [
        actions.comments.get.successType,
        actions.comments.get.requestType,
        requestType,
        successType
      ],
      () => {
        store.dispatch(actions.comments.get(post.id))
        store.dispatch(actions.comments.post(post.id, "comment text"))
      }
    ).then(state => {
      assert.isTrue(state.loaded)
      assert.deepInclude(state.data.get(post.id), {
        post_id: post.id,
        text:    "comment text"
      })
      assert.equal(state.postStatus, FETCH_SUCCESS)
      assert.ok(helper.createCommentStub.calledWith(post.id, "comment text"))
    })
  })

  it("should let you reply to a comment", () => {
    const { requestType, successType } = actions.comments.post
    return listenForActions(
      [
        actions.comments.get.successType,
        actions.comments.get.requestType,
        requestType,
        successType
      ],
      () => {
        store.dispatch(actions.comments.get(post.id))
        store.dispatch(
          actions.comments.post(post.id, "comment text", tree[0].id)
        )
      }
    ).then(state => {
      assert.isTrue(state.loaded)
      assert.deepInclude(state.data.get(post.id)[0].replies, {
        post_id: post.id,
        text:    "comment text"
      })
      assert.equal(state.postStatus, FETCH_SUCCESS)
      assert.ok(
        helper.createCommentStub.calledWith(post.id, "comment text", tree[0].id)
      )
    })
  })

  it("should let you update a comment", async () => {
    let comment = tree[0].replies[0]
    comment.upvoted = false
    helper.updateCommentStub.returns(
      Promise.resolve({
        ...comment,
        upvoted: true
      })
    )
    let state = await listenForActions(
      [
        actions.comments.get.requestType,
        actions.comments.get.successType,
        actions.comments.patch.requestType,
        actions.comments.patch.successType
      ],
      () => {
        store.dispatch(actions.comments.get(post.id))
        store.dispatch(
          actions.comments.patch(comment.id, {
            upvoted: true
          })
        )
      }
    )
    assert.isTrue(state.loaded)
    assert.deepEqual(state.data.get(post.id)[0].replies[0], {
      ...comment,
      upvoted: true
    })
    assert.equal(state.patchStatus, FETCH_SUCCESS)
    sinon.assert.calledWith(helper.updateCommentStub, comment.id, {
      upvoted: true
    })
  })
})

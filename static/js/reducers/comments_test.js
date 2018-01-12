import { assert } from "chai"
import sinon from "sinon"
import R from "ramda"
import { INITIAL_STATE, FETCH_SUCCESS } from "redux-hammock/constants"

import { actions } from "../actions"
import { replaceMoreComments } from "../actions/comment"
import { createCommentTree } from "../reducers/comments"
import IntegrationTestHelper from "../util/integration_test_helper"
import { wait } from "../lib/util"
import { makePost } from "../factories/posts"
import {
  makeComment,
  makeCommentsResponse,
  makeMoreComments,
  makeMoreCommentsResponse
} from "../factories/comments"
import { findComment } from "../lib/comments"

describe("comments reducers", () => {
  let helper,
    store,
    dispatchThen,
    listenForActions,
    post,
    response,
    newCommentResponse

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    post = makePost()
    response = makeCommentsResponse(post)
    newCommentResponse = null
    dispatchThen = helper.store.createDispatchThen(state => state.comments)
    listenForActions = helper.store.createListenForActions(
      state => state.comments
    )
    helper.getCommentsStub.returns(Promise.resolve(response))
    helper.createCommentStub.resetBehavior()
    helper.createCommentStub.callsFake((_, text) => {
      newCommentResponse = {
        ...makeComment(post),
        text
      }
      return Promise.resolve(newCommentResponse)
    })
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

  it("should let you get the comments for a Post", async () => {
    const { requestType, successType } = actions.comments.get
    const { data } = await dispatchThen(actions.comments.get(post.id), [
      requestType,
      successType
    ])

    const comments = data.get(post.id)
    assert.isArray(comments)
    assert.isNotEmpty(comments[0].replies)
  })

  it("should handle a comment whose parent we don't have", async () => {
    // this can happen when we're looking at a permalink for a nested comment
    const first = makeComment(post)
    const response = [makeComment(post, first.id), makeComment(post, first.id)]
    helper.getCommentStub.returns(Promise.resolve(response))
    const { requestType, successType } = actions.comments.get
    const { data } = await dispatchThen(
      actions.comments.get(post.id, response[0].id),
      [requestType, successType]
    )
    const comments = data.get(post.id)
    assert.deepEqual(comments, response)
  })

  it("should handle an empty response ok", () => {
    const { requestType, successType } = actions.comments.get
    helper.getCommentsStub.returns([])
    return dispatchThen(actions.comments.get(post.id), [
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
      const stateTree = state.data.get(post.id)
      const comment = R.view(
        findComment(stateTree, newCommentResponse.id),
        stateTree
      )
      assert.equal(comment.post_id, post.id)
      assert.equal(comment.text, "comment text")
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
          actions.comments.post(post.id, "comment text", response[0].id)
        )
      }
    ).then(state => {
      assert.isTrue(state.loaded)
      const stateTree = state.data.get(post.id)
      const comment = R.view(
        findComment(stateTree, newCommentResponse.id),
        stateTree
      )
      assert.equal(comment.post_id, post.id)
      assert.equal(comment.text, "comment text")
      assert.equal(state.postStatus, FETCH_SUCCESS)
      assert.ok(
        helper.createCommentStub.calledWith(
          post.id,
          "comment text",
          response[0].id
        )
      )
    })
  })

  it("should let you update a comment", async () => {
    const parent = response[0]
    const comment = response.find(comment => comment.id === parent.id)
    comment.upvoted = false
    helper.updateCommentStub.returns(
      Promise.resolve({
        ...comment,
        upvoted: true
      })
    )
    const state = await listenForActions(
      [
        actions.comments.get.requestType,
        actions.comments.get.successType,
        actions.comments.patch.requestType,
        actions.comments.patch.successType
      ],
      async () => {
        await store.dispatch(actions.comments.get(post.id))
        await store.dispatch(
          actions.comments.patch(comment.id, {
            upvoted: true
          })
        )
      }
    )
    assert.isTrue(state.loaded)

    const tree = createCommentTree(response)
    const commentInTree = R.view(findComment(tree, comment.id), tree)
    const stateTree = state.data.get(post.id)
    const commentInState = R.view(findComment(stateTree, comment.id), stateTree)
    assert.deepEqual(commentInState, { ...commentInTree, upvoted: true })
    assert.equal(state.patchStatus, FETCH_SUCCESS)
    sinon.assert.calledWith(helper.updateCommentStub, comment.id, {
      upvoted: true
    })
  })

  it("should let you delete a comment", async () => {
    const [comment] = response
    helper.deleteCommentStub.returns(
      Promise.resolve({
        commentId: comment.id,
        postId:    post.id
      })
    )
    const state = await listenForActions(
      [
        actions.comments.get.requestType,
        actions.comments.get.successType,
        actions.comments["delete"].requestType,
        actions.comments["delete"].successType
      ],
      async () => {
        await store.dispatch(actions.comments.get(post.id))
        await store.dispatch(actions.comments["delete"](post.id, comment.id))
      }
    )
    const [updatedComment] = state.data.get(post.id)
    assert.equal(updatedComment.author_name, "[deleted]")
    assert.equal(updatedComment.text, "[deleted]")
    assert.equal(updatedComment.author_id, "[deleted]")
  })

  it("should let you delete a nested comment with replies", async () => {
    const tree = createCommentTree(response)
    const [{ replies: [reply] }] = tree
    helper.deleteCommentStub.returns(
      Promise.resolve({
        commentId: reply.id,
        postId:    post.id
      })
    )
    const state = await listenForActions(
      [
        actions.comments.get.requestType,
        actions.comments.get.successType,
        actions.comments["delete"].requestType,
        actions.comments["delete"].successType
      ],
      async () => {
        await store.dispatch(actions.comments.get(post.id))
        await store.dispatch(actions.comments["delete"](post.id, reply.id))
      }
    )
    const [{ replies: [updatedReply] }] = state.data.get(post.id)
    assert.equal(updatedReply.author_name, "[deleted]")
    assert.equal(updatedReply.text, "[deleted]")
  })

  describe("more_comments", () => {
    it("creates a comment tree from a response which also contains more_comments", () => {
      const parent = makeComment(post)
      const reply = makeComment(post, parent.id)
      const moreCommentsRoot = makeMoreComments(post, null)
      const moreCommentsReply = makeMoreComments(post, parent.id)
      const comments = [parent, reply, moreCommentsRoot, moreCommentsReply]

      assert.deepEqual(createCommentTree(comments), [
        {
          ...parent,
          replies: [
            {
              ...reply,
              replies: []
            },
            moreCommentsReply
          ]
        },
        moreCommentsRoot
      ])
    })

    it("swaps a more_comments object with some comments at the root level", async () => {
      const parent = makeComment(post)
      const reply = makeComment(post, parent.id)
      const moreCommentsRoot = makeMoreComments(post, null)
      const moreCommentsReply = makeMoreComments(post, parent.id)
      const comments = [parent, reply, moreCommentsRoot, moreCommentsReply]
      helper.getCommentsStub.returns(Promise.resolve(comments))

      await listenForActions(
        [actions.comments.get.requestType, actions.comments.get.successType],
        () => {
          store.dispatch(actions.comments.get(post.id))
        }
      )

      const firstNewComment = makeComment(post)
      const firstNewCommentReply = makeComment(post, firstNewComment.id)
      const secondNewComment = makeComment(post)
      const newMoreComments = makeMoreComments(post, null)
      const newComments = [
        firstNewComment,
        firstNewCommentReply,
        secondNewComment,
        newMoreComments
      ]
      store.dispatch(
        replaceMoreComments({
          postId:   post.id,
          parentId: null,
          comments: newComments
        })
      )

      assert.deepEqual(store.getState().comments.data.get(post.id), [
        {
          ...parent,
          replies: [
            {
              ...reply,
              replies: []
            },
            moreCommentsReply
          ]
        },
        {
          ...firstNewComment,
          replies: [
            {
              ...firstNewCommentReply,
              replies: []
            }
          ]
        },
        {
          ...secondNewComment,
          replies: []
        },
        newMoreComments
      ])
    })

    it("swaps a more_comments object with some comments for a reply", async () => {
      const parent = makeComment(post)
      const reply = makeComment(post, parent.id)
      const moreCommentsRoot = makeMoreComments(post, null)
      const moreCommentsReply = makeMoreComments(post, parent.id)
      const comments = [parent, reply, moreCommentsRoot, moreCommentsReply]
      helper.getCommentsStub.returns(Promise.resolve(comments))

      await listenForActions(
        [actions.comments.get.requestType, actions.comments.get.successType],
        () => {
          store.dispatch(actions.comments.get(post.id))
        }
      )

      const firstNewComment = makeComment(post, parent.id)
      const firstNewCommentReply = makeComment(post, firstNewComment.id)
      const secondNewComment = makeComment(post, parent.id)
      const newMoreComments = makeMoreComments(post, parent.id)
      const newComments = [
        firstNewComment,
        firstNewCommentReply,
        secondNewComment,
        newMoreComments
      ]
      store.dispatch(
        replaceMoreComments({
          postId:   post.id,
          parentId: parent.id,
          comments: newComments
        })
      )

      assert.deepEqual(store.getState().comments.data.get(post.id), [
        {
          ...parent,
          replies: [
            {
              ...reply,
              replies: []
            },
            {
              ...firstNewComment,
              replies: [
                {
                  ...firstNewCommentReply,
                  replies: []
                }
              ]
            },
            {
              ...secondNewComment,
              replies: []
            },
            newMoreComments
          ]
        },
        moreCommentsRoot
      ])
    })

    it("does not update the state when fetching more comments, except to mark it as loaded", async () => {
      const parent = response[0]
      const moreComments = makeMoreCommentsResponse(post, parent)
      helper.getMoreCommentsStub.returns(Promise.resolve(moreComments))
      let resp
      await listenForActions(
        [
          actions.morecomments.get.requestType,
          actions.morecomments.get.successType
        ],
        async () => {
          resp = await store.dispatch(actions.morecomments.get(post.id))
        }
      )

      const state = helper.store.getState().morecomments
      assert.isTrue(state.loaded)
      assert.equal(state.data, undefined)
      await wait(0) // go through a loop and let resp get assigned to
      assert.deepEqual(resp, moreComments)
    })
  })
})

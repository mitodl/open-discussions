import R from "ramda"
import { assert } from "chai"
import sinon from "sinon"

import { actions } from "../actions"
import { SET_POST_DATA } from "../actions/post"
import { SET_SNACKBAR_MESSAGE } from "../actions/ui"
import {
  approvePost,
  removePost,
  approveComment,
  removeComment,
  toggleFollowComment,
  toggleFollowPost,
  leaveChannel
} from "../util/api_actions"
import IntegrationTestHelper from "../util/integration_test_helper"

import { makePost } from "../factories/posts"
import { makeCommentsResponse, makeComment } from "../factories/comments"
import { findComment } from "../lib/comments"

describe("api_actions util", () => {
  let helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("toggleFollowPost", () => {
    beforeEach(() => {
      helper.editPostStub.returns(Promise.resolve(makePost))
    })
    ;[true, false].forEach(subscribed => {
      it(`should set subscribed from ${subscribed} to ${!subscribed} and show a snackbar message`, async () => {
        const post = makePost()
        post.subscribed = subscribed

        const { requestType, successType } = actions.posts.patch

        await helper.listenForActions(
          [requestType, successType, SET_SNACKBAR_MESSAGE],
          () => {
            toggleFollowPost(helper.store.dispatch, post)
          }
        )
      })
    })
  })

  describe("toggleFollowComment", () => {
    beforeEach(() => {
      helper.updateCommentStub.returns(Promise.resolve(makePost))
    })
    ;[true, false].forEach(subscribed => {
      it(`should set subscribed from ${subscribed} to ${!subscribed} and show a snackbar message`, async () => {
        const comment = makeComment(makePost())
        comment.subscribed = subscribed

        const { requestType, successType } = actions.comments.patch

        await helper.listenForActions(
          [requestType, successType, SET_SNACKBAR_MESSAGE],
          () => {
            toggleFollowComment(helper.store.dispatch, comment)
          }
        )
      })
    })
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

  describe("approveComment", () => {
    let post, response
    beforeEach(() => {
      post = makePost()
      response = makeCommentsResponse(post)
      helper.getCommentsStub.returns(Promise.resolve(response))
    })

    it("should patch the comment and set the updated value", async () => {
      const comment = response[0]
      // $FlowFixMe: flow can't reason about comment.id properly
      comment.removed = true
      helper.updateCommentStub.returns(
        Promise.resolve({
          ...comment,
          removed: false
        })
      )
      const state = await helper.listenForActions(
        [
          actions.comments.get.requestType,
          actions.comments.get.successType,
          actions.comments.patch.requestType,
          actions.comments.patch.successType
        ],
        async () => {
          await helper.store.dispatch(actions.comments.get(post.id))
          await approveComment(helper.store.dispatch, comment)
        }
      )
      const stateTree = state.comments.data.get(post.id)
      const resultComment = R.view(
        // $FlowFixMe: flow can't reason about comment.id properly
        findComment(stateTree, comment.id),
        stateTree
      )

      assert.isOk(
        // $FlowFixMe: flow can't reason about comment.id properly
        helper.updateCommentStub.calledWith(comment.id, { removed: false })
      )
      assert.equal(resultComment.removed, false)
    })
  })

  describe("removeComment", () => {
    let post, response
    beforeEach(() => {
      post = makePost()
      response = makeCommentsResponse(post)
      helper.getCommentsStub.returns(Promise.resolve(response))
    })

    it("should patch the comment and set the updated value", async () => {
      const comment = response[0]
      // $FlowFixMe: flow can't reason about comment.id properly
      comment.removed = false
      helper.updateCommentStub.returns(
        Promise.resolve({
          ...comment,
          removed: true
        })
      )
      const state = await helper.listenForActions(
        [
          actions.comments.get.requestType,
          actions.comments.get.successType,
          actions.comments.patch.requestType,
          actions.comments.patch.successType
        ],
        async () => {
          await helper.store.dispatch(actions.comments.get(post.id))
          await removeComment(helper.store.dispatch, comment)
        }
      )
      const stateTree = state.comments.data.get(post.id)
      const resultComment = R.view(
        // $FlowFixMe: flow can't reason about comment.id properly
        findComment(stateTree, comment.id),
        stateTree
      )

      assert.isOk(
        // $FlowFixMe: flow can't reason about comment.id properly
        helper.updateCommentStub.calledWith(comment.id, { removed: true })
      )
      assert.equal(resultComment.removed, true)
    })
  })

  describe("leaveChannel", () => {
    const channelName = "some_channel_name",
      username = "someuser"

    beforeEach(() => {
      helper.deleteChannelSubscriberStub.returns(Promise.resolve())
      helper.deleteChannelContributorStub.returns(Promise.resolve())
    })

    it("should make requests to remove the user as a subscriber and contributor", async () => {
      await helper.listenForActions(
        [
          actions.channelSubscribers.delete.requestType,
          actions.channelSubscribers.delete.successType,
          actions.channelContributors.delete.requestType,
          actions.channelContributors.delete.successType
        ],
        async () => {
          await leaveChannel(helper.store.dispatch, channelName, username)
        }
      )
      sinon.assert.calledWithExactly(
        helper.deleteChannelSubscriberStub,
        channelName,
        username
      )
      sinon.assert.calledWithExactly(
        helper.deleteChannelContributorStub,
        channelName,
        username
      )
    })
  })
})

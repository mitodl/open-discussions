// @flow
import { assert } from "chai"
import sinon from "sinon"

import CommentTree from "../components/CommentTree"

import { makePost } from "../factories/posts"
import { makeCommentTree } from "../factories/comments"
import { makeChannel } from "../factories/channels"
import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { findComment } from "../lib/comments"

describe("PostPage", function() {
  let helper, renderComponent, listenForActions, post, comments, channel

  beforeEach(() => {
    post = makePost()
    comments = makeCommentTree(post, 3)
    channel = makeChannel()

    helper = new IntegrationTestHelper()
    helper.getPostStub.returns(Promise.resolve(post))
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getCommentsStub.returns(
      Promise.resolve({
        postID: post.id,
        data:   comments
      })
    )
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = () =>
    renderComponent(`/channel/${channel.name}/${post.id}/`, [
      actions.posts.get.requestType,
      actions.posts.get.successType,
      actions.comments.get.requestType,
      actions.comments.get.successType,
      actions.channels.get.requestType,
      actions.channels.get.successType
    ])

  it("should fetch post, comments, channel, and render", async () => {
    let [wrapper] = await renderPage()
    assert.deepEqual(wrapper.find(CommentTree).props().comments, comments)
  })

  for (const isUpvote of [true, false]) {
    for (const isClear of [true, false]) {
      let verb = ""
      if (isClear) {
        verb += "clear a "
      }
      verb += isUpvote ? "upvote" : "downvote"

      it(`should ${verb} for a comment`, async () => {
        const comment = comments[0].replies[2]
        assert(comment, "comment not found")
        // set initial state for upvoted or downvoted so we can flip it the other way
        let expectedPayload = {}
        if (isUpvote) {
          comment.upvoted = isClear
          expectedPayload.upvoted = !isClear
        } else {
          comment.downvoted = isClear
          expectedPayload.downvoted = !isClear
        }
        const [wrapper] = await renderPage()

        const expectedComment = {
          ...comment,
          ...expectedPayload
        }
        helper.updateCommentStub.returns(Promise.resolve(expectedComment))

        let newState = await listenForActions(
          [actions.comments.patch.requestType, actions.comments.patch.successType],
          () => {
            let props = wrapper.find("CommentTree").props()
            let voteFunc = isUpvote ? props.upvote : props.downvote
            voteFunc(comment)
          }
        )

        let updatedComment = findComment(newState.comments.data, comment.id)
        if (isUpvote) {
          assert.equal(comment.upvoted, !updatedComment.upvoted)
        } else {
          assert.equal(comment.downvoted, !updatedComment.downvoted)
        }
        assert.deepEqual(updatedComment, expectedComment)

        sinon.assert.calledWith(helper.updateCommentStub, comment.id, expectedPayload)
      })
    }
  }

  it("passed props to each CommentVoteForm", async () => {
    const [wrapper] = await renderPage()
    let commentTree = wrapper.find("CommentTree")
    let commentTreeProps = commentTree.props()
    for (const form of wrapper.find("CommentVoteForm")) {
      const fromProps = form.props
      assert.equal(fromProps.downvote, commentTreeProps.downvote)
      assert.equal(fromProps.upvote, commentTreeProps.upvote)
    }
  })
})

// @flow
import { assert } from "chai"
import sinon from "sinon"
import R from "ramda"

import CommentTree from "../components/CommentTree"

import { makePost } from "../factories/posts"
import { makeCommentTree } from "../factories/comments"
import { makeChannel, makeModerators } from "../factories/channels"
import { actions } from "../actions"
import { FORM_BEGIN_EDIT } from "../actions/forms"
import IntegrationTestHelper from "../util/integration_test_helper"
import { findComment } from "../lib/comments"
import { postDetailURL } from "../lib/url"
import { formatTitle } from "../lib/title"

describe("PostPage", function() {
  let helper,
    renderComponent,
    listenForActions,
    post,
    comments,
    channel,
    moderators
  this.timeout(5000)

  beforeEach(() => {
    post = makePost()
    comments = makeCommentTree(post, 3)
    channel = makeChannel()
    moderators = makeModerators()

    helper = new IntegrationTestHelper()
    helper.getPostStub.returns(Promise.resolve(post))
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([]))
    helper.getCommentsStub.returns(
      Promise.resolve({
        postID: post.id,
        data:   comments
      })
    )
    helper.getChannelModeratorsStub.returns(Promise.resolve(moderators))
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = () =>
    renderComponent(postDetailURL(channel.name, post.id), [
      actions.posts.get.requestType,
      actions.posts.get.successType,
      actions.comments.get.requestType,
      actions.comments.get.successType,
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType,
      actions.channels.get.requestType,
      actions.channels.get.successType,
      actions.channelModerators.get.requestType,
      actions.channelModerators.get.successType,
      FORM_BEGIN_EDIT
    ])

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle(post.title))
  })

  it("should fetch post, comments, channel, and render", async () => {
    const [wrapper] = await renderPage()
    assert.deepEqual(wrapper.find(CommentTree).props().comments, comments)
  })
  ;[
    [true, true, "should upvote a comment"],
    [true, false, "should clear an upvote"],
    [false, true, "should downvote a comment"],
    [false, false, "should clear a downvote"]
  ].forEach(([isUpvote, wasClear, testName]) => {
    it(testName, async () => {
      const comment = comments[0].replies[2]
      assert(comment, "comment not found")
      // set initial state for upvoted or downvoted so we can flip it the other way
      const expectedPayload = {}
      if (isUpvote) {
        comment.upvoted = wasClear
        expectedPayload.upvoted = !wasClear
      } else {
        comment.downvoted = wasClear
        expectedPayload.downvoted = !wasClear
      }
      const [wrapper] = await renderPage()

      const expectedComment = {
        ...comment,
        ...expectedPayload
      }
      helper.updateCommentStub.returns(Promise.resolve(expectedComment))

      const newState = await listenForActions(
        [
          actions.comments.patch.requestType,
          actions.comments.patch.successType
        ],
        () => {
          const props = wrapper.find("CommentTree").props()
          const voteFunc = isUpvote ? props.upvote : props.downvote
          voteFunc(comment)
        }
      )

      const commentTree = newState.comments.data.get(post.id)
      const lens = findComment(commentTree, comment.id)
      const updatedComment = R.view(lens, commentTree)
      if (isUpvote) {
        assert.equal(comment.upvoted, !updatedComment.upvoted)
      } else {
        assert.equal(comment.downvoted, !updatedComment.downvoted)
      }
      assert.deepEqual(updatedComment, expectedComment)

      sinon.assert.calledWith(
        helper.updateCommentStub,
        comment.id,
        expectedPayload
      )
    })
  })

  it("passed props to each CommentVoteForm", async () => {
    const [wrapper] = await renderPage()
    const commentTree = wrapper.find("CommentTree")
    const commentTreeProps = commentTree.props()
    for (const form of wrapper.find("CommentVoteForm")) {
      const fromProps = form.props
      assert.equal(fromProps.downvote, commentTreeProps.downvote)
      assert.equal(fromProps.upvote, commentTreeProps.upvote)
    }
  })
})

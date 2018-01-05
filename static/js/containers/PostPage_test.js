/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import R from "ramda"
import { Dialog } from "@mitodl/mdl-react-components"

import CommentTree from "../components/CommentTree"
import NotFound from "../components/404"

import { makePost, makeChannelPostList } from "../factories/posts"
import {
  makeComment,
  makeCommentsResponse,
  makeMoreComments
} from "../factories/comments"
import { makeChannel, makeModerators } from "../factories/channels"
import { actions } from "../actions"
import { SET_POST_DATA } from "../actions/post"
import { SET_CHANNEL_DATA } from "../actions/channel"
import { REPLACE_MORE_COMMENTS } from "../actions/comment"
import { FORM_BEGIN_EDIT } from "../actions/forms"
import { SET_SNACKBAR_MESSAGE, SHOW_DIALOG } from "../actions/ui"
import { SET_FOCUSED_COMMENT } from "../actions/focus"
import IntegrationTestHelper from "../util/integration_test_helper"
import { findComment } from "../lib/comments"
import { postDetailURL, channelURL } from "../lib/url"
import { formatTitle } from "../lib/title"
import { createCommentTree } from "../reducers/comments"

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
    const commentsResponse = makeCommentsResponse(post, 3)
    comments = createCommentTree(commentsResponse)
    channel = makeChannel()
    moderators = makeModerators()

    helper = new IntegrationTestHelper()
    helper.getPostStub.returns(Promise.resolve(post))
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([]))
    helper.getCommentsStub.returns(Promise.resolve(commentsResponse))
    helper.getChannelModeratorsStub.returns(Promise.resolve(moderators))
    helper.getPostsForChannelStub.returns(
      Promise.resolve({
        posts: makeChannelPostList()
      })
    )
    helper.deletePostStub.returns(Promise.resolve())
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
      FORM_BEGIN_EDIT,
      SET_CHANNEL_DATA
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

  it("passed props to each CommentRemovalForm", async () => {
    const [wrapper] = await renderPage()
    const commentTree = wrapper.find("CommentTree")
    const commentTreeProps = commentTree.props()
    for (const form of wrapper.find("CommentRemovalForm")) {
      const fromProps = form.props
      assert.equal(fromProps.approve, commentTreeProps.approve)
      assert.equal(fromProps.remove, commentTreeProps.remove)
    }
  })

  it("loads more comments when the function is called", async () => {
    const [wrapper] = await renderPage()
    const commentTree = wrapper.find("CommentTree")
    const commentTreeProps = commentTree.props()
    const parent = comments[0]
    const moreComments = makeMoreComments(post, parent.id)
    const newComment = makeComment(post, parent.id)
    const newComments = [newComment]

    helper.getMoreCommentsStub.returns(Promise.resolve(newComments))
    await listenForActions(
      [
        actions.morecomments.get.requestType,
        actions.morecomments.get.successType,
        REPLACE_MORE_COMMENTS
      ],
      () => {
        commentTreeProps.loadMoreComments(moreComments)
      }
    )

    sinon.assert.calledWith(
      helper.getMoreCommentsStub,
      post.id,
      parent.id,
      moreComments.children
    )
    const reducerTree = helper.store.getState().comments.data.get(post.id)
    const newCommentInTree =
      reducerTree[0].replies[reducerTree[0].replies.length - 1]
    assert.deepEqual(newCommentInTree, newComment)
  })

  it("should let a user delete their own post, then redirect to channel page", async () => {
    SETTINGS.username = post.author_id
    const [wrapper] = await renderPage()
    await listenForActions(
      [
        actions.posts["delete"].requestType,
        actions.posts["delete"].successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.postsForChannel.get.requestType,
        actions.channelModerators.get.requestType,
        SET_SNACKBAR_MESSAGE
      ],
      () => {
        wrapper.find(Dialog).at(2).props().onAccept()
      }
    )
    const { location: { pathname } } = helper.browserHistory
    assert.equal(pathname, channelURL(channel.name))
  })

  describe("as a moderator user", () => {
    beforeEach(() => {
      helper.getChannelModeratorsStub.returns(
        Promise.resolve(makeModerators(SETTINGS.username))
      )
    })

    it("should remove the post", async () => {
      post.removed = false
      const [wrapper] = await renderPage()
      const expected = {
        ...post,
        removed: true
      }
      helper.updateRemovedStub.returns(Promise.resolve(expected))

      const newState = await listenForActions(
        [
          actions.postRemoved.patch.requestType,
          actions.postRemoved.patch.successType,
          SET_POST_DATA,
          SET_SNACKBAR_MESSAGE
        ],
        () => {
          const props = wrapper.find("ExpandedPostDisplay").props()
          props.removePost(post)
        }
      )

      assert.deepEqual(newState.posts.data.get(post.id), expected)
      assert.deepEqual(newState.ui.snackbar, {
        id:      0,
        message: "Post has been removed"
      })

      sinon.assert.calledWith(helper.updateRemovedStub, post.id, true)
    })

    it("should approve the post", async () => {
      post.removed = true
      const [wrapper] = await renderPage()
      const expected = {
        ...post,
        removed: false
      }
      helper.updateRemovedStub.returns(Promise.resolve(expected))

      const newState = await listenForActions(
        [
          actions.postRemoved.patch.requestType,
          actions.postRemoved.patch.successType,
          SET_POST_DATA,
          SET_SNACKBAR_MESSAGE
        ],
        () => {
          const props = wrapper.find("ExpandedPostDisplay").props()
          props.approvePost(post)
        }
      )

      assert.deepEqual(newState.posts.data.get(post.id), expected)
      assert.deepEqual(newState.ui.snackbar, {
        id:      0,
        message: "Post has been approved"
      })

      sinon.assert.calledWith(helper.updateRemovedStub, post.id, false)
    })
    ;[
      [false, "should remove a comment"],
      [true, "should approve a comment"]
    ].forEach(([isRemoved, testName]) => {
      it(testName, async () => {
        const comment = comments[0].replies[2]
        assert(comment, "comment not found")
        // set initial state for removed so we can flip it the other way
        const expectedPayload = { removed: !isRemoved }
        comment.removed = isRemoved

        const [wrapper] = await renderPage()

        const expectedComment = {
          ...comment,
          ...expectedPayload
        }
        helper.updateCommentStub.returns(Promise.resolve(expectedComment))

        const patchActions = [
          actions.comments.patch.requestType,
          actions.comments.patch.successType
        ]
        let expectedActions = []
        if (isRemoved) {
          // if we're approving it, the patch actions fire immediately
          expectedActions = patchActions
        } else {
          // otherwise a confirmation dialog shows
          expectedActions = [SHOW_DIALOG, SET_FOCUSED_COMMENT]
        }

        let newState = await listenForActions(expectedActions, () => {
          const props = wrapper.find("CommentTree").props()
          const modFunc = isRemoved ? props.approve : props.remove
          modFunc(comment)
        })

        if (!isRemoved) {
          // if we are removing the comment, handle the confirmation dialog
          newState = await listenForActions(patchActions, () => {
            wrapper.find("Dialog").at(0).props().onAccept()
          })
        }

        const commentTree = newState.comments.data.get(post.id)
        const lens = findComment(commentTree, comment.id)
        const updatedComment = R.view(lens, commentTree)
        assert.deepEqual(updatedComment, expectedComment)

        sinon.assert.calledWith(
          helper.updateCommentStub,
          comment.id,
          expectedPayload
        )
      })
    })
  })

  it("should show a 404 page", async () => {
    helper.getPostStub.returns(Promise.reject({ errorStatusCode: 404 }))
    const [wrapper] = await renderComponent(
      postDetailURL(channel.name, post.id),
      [
        actions.posts.get.requestType,
        actions.posts.get.failureType,
        actions.comments.get.requestType,
        actions.comments.get.successType,
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.channelModerators.get.requestType,
        actions.channelModerators.get.successType,
        SET_CHANNEL_DATA
      ]
    )
    assert(wrapper.find(NotFound).exists())
  })

  it("should show the normal error page for non 404 errors", async () => {
    helper.getPostStub.returns(Promise.reject({ errorStatusCode: 401 }))
    const [wrapper] = await renderComponent(
      postDetailURL(channel.name, post.id),
      [
        actions.posts.get.requestType,
        actions.posts.get.failureType,
        actions.comments.get.requestType,
        actions.comments.get.successType,
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.channelModerators.get.requestType,
        actions.channelModerators.get.successType,
        SET_CHANNEL_DATA
      ]
    )
    assert.equal(wrapper.find(".main-content").text(), "Error loading page")
    assert.isFalse(wrapper.find(NotFound).exists())
  })
})

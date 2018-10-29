/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import R from "ramda"
import { Link } from "react-router-dom"

import CommentTree from "../components/CommentTree"
import { NotFound, NotAuthorized } from "../components/ErrorPages"
import ExpandedPostDisplay from "../components/ExpandedPostDisplay"
import PostPage from "./PostPage"
import { ReplyToPostForm } from "../components/CommentForms"

import { makePost, makeChannelPostList } from "../factories/posts"
import {
  makeComment,
  makeCommentsResponse,
  makeMoreComments
} from "../factories/comments"
import { makeChannel } from "../factories/channels"
import { actions } from "../actions"
import { SET_POST_DATA } from "../actions/post"
import { SET_CHANNEL_DATA } from "../actions/channel"
import { REPLACE_MORE_COMMENTS } from "../actions/comment"
import { FORM_BEGIN_EDIT, FORM_END_EDIT, FORM_VALIDATE } from "../actions/forms"
import { SET_SNACKBAR_MESSAGE, SHOW_DIALOG, HIDE_DIALOG } from "../actions/ui"
import {
  SET_FOCUSED_POST,
  CLEAR_FOCUSED_POST,
  SET_FOCUSED_COMMENT,
  CLEAR_FOCUSED_COMMENT
} from "../actions/focus"
import IntegrationTestHelper from "../util/integration_test_helper"
import { findComment } from "../lib/comments"
import { postDetailURL, channelURL, commentPermalink } from "../lib/url"
import { formatTitle } from "../lib/title"
import { createCommentTree } from "../reducers/comments"
import { makeReportRecord } from "../factories/reports"
import { VALID_COMMENT_SORT_TYPES } from "../lib/picker"
import { makeArticle, makeTweet } from "../factories/embedly"
import * as utilFuncs from "../lib/util"
import * as embedUtil from "../lib/embed"
import { removeTrailingSlash, truncate } from "../lib/util"
import { NOT_AUTHORIZED_ERROR_TYPE } from "../util/rest"

describe("PostPage", function() {
  let helper,
    renderComponent,
    listenForActions,
    post,
    comments,
    channel,
    twitterEmbedStub

  this.timeout(5000)

  beforeEach(() => {
    post = makePost()
    const commentsResponse = makeCommentsResponse(post, 3)
    comments = createCommentTree(commentsResponse)
    channel = makeChannel()

    helper = new IntegrationTestHelper()
    helper.getPostStub.returns(Promise.resolve(post))
    helper.getEmbedlyStub.returns(Promise.resolve(makeArticle()))
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([]))
    helper.getCommentsStub.returns(Promise.resolve(commentsResponse))
    helper.getCommentStub.returns(
      Promise.resolve(R.slice(0, 1, commentsResponse))
    )
    helper.getPostsForChannelStub.returns(
      Promise.resolve({
        posts: makeChannelPostList()
      })
    )
    helper.deletePostStub.returns(Promise.resolve())
    helper.getReportsStub.returns(Promise.resolve(R.times(makeReportRecord, 4)))
    helper.getProfileStub.returns(Promise.resolve(""))
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
    twitterEmbedStub = helper.sandbox.stub(embedUtil, "ensureTwitterEmbedJS")
  })

  afterEach(() => {
    helper.cleanup()
  })

  const basicPostPageActions = [
    actions.profiles.get.requestType,
    actions.profiles.get.successType,
    actions.posts.get.requestType,
    actions.posts.get.successType,
    actions.comments.get.requestType,
    actions.comments.get.successType,
    actions.subscribedChannels.get.requestType,
    actions.subscribedChannels.get.successType,
    actions.channels.get.requestType,
    actions.channels.get.successType,
    SET_CHANNEL_DATA
  ]

  const renderPage = async () => {
    const [wrapper] = await renderComponent(
      postDetailURL(channel.name, post.id),
      basicPostPageActions.concat(FORM_BEGIN_EDIT)
    )
    return wrapper.update()
  }

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle(post.title))
  })

  it("should set the document meta description", async () => {
    await renderPage()
    assert.equal(
      document.head.querySelector("[name=description]").content,
      truncate(post.text, 300)
    )
  })

  it("should set the document meta canonical link to the post detail url", async () => {
    await renderPage()
    assert.equal(
      document.head.querySelector("[rel=canonical]").href,
      removeTrailingSlash(
        `http://fake.open.url${postDetailURL(channel.name, post.id, post.slug)}`
      )
    )
  })

  it("should set the document meta canonical link to the comment permalink", async () => {
    const commentLink = commentPermalink(
      channel.name,
      post.id,
      post.slug,
      comments[0].id
    )
    const [wrapper] = await renderComponent(commentLink, basicPostPageActions)
    wrapper.update()
    assert.equal(
      document.head.querySelector("[rel=canonical]").href,
      removeTrailingSlash(`http://fake.open.url${commentLink}`)
    )
  })

  it("should fetch post, comments, channel, and render", async () => {
    const wrapper = await renderPage()
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
      const wrapper = await renderPage()

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

  it("should load twitter JS on page load", async () => {
    await renderPage()
    assert.ok(twitterEmbedStub.called)
  })

  it("should call window.twttr.widgets.load() if a twitter embed", async () => {
    post.url = "http://foo.bar.example.com/baz"
    post.text = null
    helper.getEmbedlyStub.returns(Promise.resolve({ response: makeTweet() }))

    window.twttr = {
      widgets: { load: helper.sandbox.stub() }
    }

    await renderComponent(
      postDetailURL(channel.name, post.id),
      basicPostPageActions.concat([
        FORM_BEGIN_EDIT,
        actions.embedly.get.requestType,
        actions.embedly.get.successType
      ])
    )
    assert.ok(window.twttr.widgets.load.called)
  })

  it("should show a comment permalink UI if at the right URL", async () => {
    const [wrapper] = await renderComponent(
      commentPermalink(channel.name, post.id, post.slug, comments[0].id),
      basicPostPageActions
    )
    wrapper.update()
    const card = wrapper.find(".comment-detail-card")
    assert(card.exists())
    assert.equal(
      card
        .find("div")
        .at(2)
        .text(),
      "You are viewing a single comment's thread."
    )
    assert.equal(
      card.find(Link).props().to,
      postDetailURL(channel.name, post.id, post.slug)
    )
    assert.equal(
      card.find(Link).props().children,
      "View the rest of the comments"
    )
    assert.isTrue(wrapper.find(ExpandedPostDisplay).props().showPermalinkUI)
  })

  it("should hide the comments header section when there are no comments", async () => {
    post.num_comments = 0
    helper.getPostStub.returns(Promise.resolve(post))
    helper.getCommentsStub.returns(Promise.resolve([]))
    const wrapper = await renderPage()
    assert.isFalse(wrapper.find(".count-and-sort").exists())
  })

  //
  ;[true, false].forEach(userIsAnon => {
    it(`should show a ReplyToPostForm when userIsAnonymous() === ${userIsAnon}`, async () => {
      const anonStub = helper.sandbox.stub(utilFuncs, "userIsAnonymous")
      anonStub.returns(userIsAnon)

      const [wrapper] = await renderComponent(
        postDetailURL(channel.name, post.id),
        userIsAnon
          ? basicPostPageActions
          : basicPostPageActions.concat(FORM_BEGIN_EDIT)
      )
      wrapper.update()

      assert.ok(wrapper.find(ReplyToPostForm).exists())
    })
  })

  it("passed props to each CommentVoteForm", async () => {
    const wrapper = await renderPage()
    const commentTree = wrapper.find("CommentTree")
    const commentTreeProps = commentTree.props()
    for (const form of wrapper.find("CommentVoteForm")) {
      const fromProps = form.props
      assert.equal(fromProps.downvote, commentTreeProps.downvote)
      assert.equal(fromProps.upvote, commentTreeProps.upvote)
    }
  })

  it("passed props to each CommentRemovalForm", async () => {
    const wrapper = await renderPage()
    const commentTree = wrapper.find("CommentTree")
    const commentTreeProps = commentTree.props()
    for (const form of wrapper.find("CommentRemovalForm")) {
      const fromProps = form.props
      assert.equal(fromProps.approve, commentTreeProps.approve)
      assert.equal(fromProps.remove, commentTreeProps.remove)
    }
  })

  it("loads more comments when the function is called", async () => {
    const wrapper = await renderPage()
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
    const wrapper = await renderPage()
    await listenForActions(
      [
        actions.posts["delete"].requestType,
        actions.posts["delete"].successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.postsForChannel.get.requestType,
        SET_SNACKBAR_MESSAGE
      ],
      () => {
        wrapper
          .find("OurDialog")
          .at(4)
          .props()
          .onAccept()
      }
    )
    const {
      location: { pathname }
    } = helper.browserHistory
    assert.equal(pathname, channelURL(channel.name))
  })

  describe("as a moderator user", () => {
    beforeEach(() => {
      channel.user_is_moderator = true
    })

    it("should remove the post", async () => {
      post.removed = false
      const wrapper = await renderPage()
      const expected = {
        ...post,
        removed: true
      }
      helper.updateRemovedStub.returns(Promise.resolve(expected))

      const newState = await listenForActions(
        [
          SHOW_DIALOG,
          SET_FOCUSED_POST,
          actions.postRemoved.patch.requestType,
          actions.postRemoved.patch.successType,
          HIDE_DIALOG,
          CLEAR_FOCUSED_POST,
          SET_POST_DATA,
          SET_SNACKBAR_MESSAGE
        ],
        () => {
          const props = wrapper.find("ExpandedPostDisplay").props()
          props.removePost(post)
          wrapper
            .find("OurDialog")
            .at(1)
            .props()
            .onAccept({ preventDefault: helper.sandbox.stub() })
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
      const wrapper = await renderPage()
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

    //
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

        const wrapper = await renderPage()

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
            wrapper
              .find("OurDialog")
              .at(2)
              .props()
              .onAccept({ preventDefault: helper.sandbox.stub() })
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

    it("should report a comment", async () => {
      const comment = comments[0].replies[2]
      assert(comment, "comment not found")

      const wrapper = await renderPage()

      helper.reportContentStub.returns(Promise.resolve())

      await listenForActions(
        [SHOW_DIALOG, SET_FOCUSED_COMMENT, FORM_BEGIN_EDIT],
        () => {
          const reportFunc = wrapper.find("CommentTree").props().reportComment
          reportFunc(comment)
        }
      )

      wrapper.update()
      const dialog = wrapper.find("OurDialog").at(5)
      dialog.find("input").simulate("change", {
        target: {
          name:  "reason",
          value: "spam"
        }
      })

      await listenForActions(
        [
          actions.reports.post.requestType,
          actions.reports.post.successType,
          CLEAR_FOCUSED_COMMENT,
          HIDE_DIALOG,
          FORM_END_EDIT
        ],
        () => {
          dialog.props().onAccept()
        }
      )
      sinon.assert.calledWith(helper.reportContentStub, {
        comment_id: comment.id,
        reason:     "spam"
      })
    })
  })

  it("should report a post", async () => {
    const wrapper = await renderPage()

    helper.reportContentStub.returns(Promise.resolve())

    const preventDefaultStub = helper.sandbox.stub()
    await listenForActions(
      [SHOW_DIALOG, FORM_BEGIN_EDIT, SET_FOCUSED_POST],
      () => {
        const reportPostFunc = wrapper.find("ExpandedPostDisplay").props()
          .showPostReportDialog
        reportPostFunc({ preventDefault: preventDefaultStub })
      }
    )
    assert.ok(preventDefaultStub.called)
    wrapper.update()

    const dialog = wrapper.find("OurDialog").at(0)
    dialog.find("input").simulate("change", {
      target: {
        name:  "reason",
        value: "spam"
      }
    })

    await listenForActions(
      [
        actions.reports.post.requestType,
        actions.reports.post.successType,
        HIDE_DIALOG,
        FORM_END_EDIT
      ],
      () => {
        dialog.props().onAccept()
      }
    )
    sinon.assert.calledWith(helper.reportContentStub, {
      post_id: post.id,
      reason:  "spam"
    })
  })

  //
  ;[
    ["should render validation for a comment report", true],
    ["should render validation for a post report", false]
  ].forEach(([testName, isComment]) => {
    it(testName, async () => {
      const wrapper = await renderPage()

      helper.reportContentStub.returns(Promise.resolve())

      const expectedActions = [SHOW_DIALOG, FORM_BEGIN_EDIT]

      if (isComment) {
        expectedActions.push(SET_FOCUSED_COMMENT)
      } else {
        expectedActions.push(SET_FOCUSED_POST)
      }

      const preventDefaultStub = helper.sandbox.stub()

      await listenForActions(expectedActions, () => {
        if (isComment) {
          const comment = comments[0].replies[2]
          assert(comment, "comment not found")
          const reportFunc = wrapper.find("CommentTree").props().reportComment
          reportFunc(comment)
        } else {
          const reportPostFunc = wrapper.find("ExpandedPostDisplay").props()
            .showPostReportDialog
          reportPostFunc({ preventDefault: preventDefaultStub })
          assert.ok(preventDefaultStub.called)
        }
      })
      wrapper.update()

      const dialog = wrapper.find("OurDialog").at(isComment ? 5 : 0)

      dialog.find("input").simulate("change", {
        target: {
          name:  "reason",
          value: "sp"
        }
      })

      await listenForActions([FORM_VALIDATE], () => {
        dialog.props().onAccept()
      })
      wrapper.update()
      assert.include(dialog.text(), "Reason must be at least 3 characters")
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
        SET_CHANNEL_DATA
      ]
    )
    wrapper.update()
    assert(wrapper.find(NotFound).exists())
  })

  it("should show an unauthorized page", async () => {
    helper.getPostStub.returns(
      Promise.reject({ error_type: NOT_AUTHORIZED_ERROR_TYPE })
    )
    const [wrapper] = await renderComponent(
      postDetailURL(channel.name, post.id),
      [
        actions.posts.get.requestType,
        actions.posts.get.failureType,
        actions.comments.get.requestType,
        actions.comments.get.successType,
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        SET_CHANNEL_DATA
      ]
    )
    wrapper.update()
    assert(wrapper.find(NotAuthorized).exists())
  })

  it("should show a 404 page for a comment 404", async () => {
    helper.getCommentsStub.returns(Promise.reject({ errorStatusCode: 404 }))
    const [wrapper] = await renderComponent(
      postDetailURL(channel.name, post.id),
      [
        actions.posts.get.requestType,
        actions.posts.get.successType,
        actions.comments.get.requestType,
        actions.comments.get.failureType,
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        SET_CHANNEL_DATA
      ]
    )
    wrapper.update()
    assert(wrapper.find(NotFound).exists())
  })

  it("should show the PostPage if a 410 happens on comments", async () => {
    // really this only happens on comments.post, but we don't have per-verb status codes so this is close enough
    helper.getCommentsStub.returns(Promise.reject({ errorStatusCode: 410 }))
    const [wrapper] = await renderComponent(
      postDetailURL(channel.name, post.id),
      [
        actions.posts.get.requestType,
        actions.posts.get.successType,
        actions.comments.get.requestType,
        actions.comments.get.failureType,
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        SET_CHANNEL_DATA
      ]
    )
    assert.isNotOk(wrapper.find(NotFound).exists())
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
        SET_CHANNEL_DATA
      ]
    )
    assert.equal(
      wrapper
        .find(".main-content")
        .at(0)
        .text(),
      "Error loading page"
    )
    assert.isFalse(wrapper.find(NotFound).exists())
  })

  it("should switch the sorting method when an option is selected", async () => {
    post.num_comments = 5
    const wrapper = await renderPage()

    for (const sortType of VALID_COMMENT_SORT_TYPES) {
      await listenForActions(
        [
          actions.posts.get.requestType,
          actions.posts.get.successType,
          actions.comments.get.requestType,
          actions.comments.get.successType
        ],
        () => {
          const select = wrapper
            .find(".count-and-sort")
            .find("CommentSortPicker")
          select.props().updatePickerParam(sortType, {
            preventDefault: helper.sandbox.stub()
          })
        }
      )
      wrapper.update()

      assert.equal(
        wrapper.find(PostPage).props().location.search,
        `?sort=${sortType}`
      )
    }
  })
})

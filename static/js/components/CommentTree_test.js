/* global SETTINGS */
import React from "react"
import sinon from "sinon"
import R from "ramda"
import { assert } from "chai"
import { mount } from "enzyme"
import { Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"

import Card from "../components/Card"
import CommentTree, { commentDropdownKey, commentShareKey } from "./CommentTree"
import {
  ReplyToCommentForm,
  replyToCommentKey,
  editCommentKey
} from "./CommentForms"
import { commentPermalink, profileURL } from "../lib/url"
import Router from "../Router"
import SharePopup from "./SharePopup"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeCommentsResponse, makeMoreComments } from "../factories/comments"
import { makePost } from "../factories/posts"
import { createCommentTree } from "../reducers/comments"
import { makeCommentReport } from "../factories/reports"
import * as utilFuncs from "../lib/util"
import { dropdownMenuFuncs } from "../lib/ui"

describe("CommentTree", () => {
  let comments,
    post,
    upvoteStub,
    downvoteStub,
    removeStub,
    approveStub,
    beginEditingStub,
    loadMoreCommentsStub,
    deleteCommentStub,
    reportCommentStub,
    toggleFollowCommentStub,
    permalinkFunc,
    helper

  beforeEach(() => {
    post = makePost()
    helper = new IntegrationTestHelper()
    comments = createCommentTree(makeCommentsResponse(post))
    upvoteStub = helper.sandbox.stub()
    downvoteStub = helper.sandbox.stub()
    removeStub = helper.sandbox.stub()
    approveStub = helper.sandbox.stub()
    beginEditingStub = helper.sandbox.stub()
    loadMoreCommentsStub = helper.sandbox.stub()
    deleteCommentStub = helper.sandbox.stub()
    reportCommentStub = helper.sandbox.stub()
    toggleFollowCommentStub = helper.sandbox.stub()
    permalinkFunc = commentPermalink("channel", post.id, post.slug)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderCommentTree = (props = {}) =>
    mount(
      <Router store={helper.store} history={helper.browserHistory}>
        <CommentTree
          comments={comments}
          forms={{}}
          upvote={upvoteStub}
          downvote={downvoteStub}
          approveStub={approveStub}
          removeStub={removeStub}
          beginEditing={R.curry(beginEditingStub)}
          processing={false}
          loadMoreComments={loadMoreCommentsStub}
          deleteComment={deleteCommentStub}
          reportComment={reportCommentStub}
          commentPermalink={permalinkFunc}
          toggleFollowComment={toggleFollowCommentStub}
          curriedDropdownMenufunc={dropdownMenuFuncs(helper.sandbox.stub())}
          dropdownMenus={new Set()}
          {...props}
        />
      </Router>
    )

  const openMenu = R.curry((keyFunc, comment) => {
    const dropdownMenus = new Set()
    dropdownMenus.add(keyFunc(comment))
    return { dropdownMenus }
  })

  const openDropdownMenu = openMenu(commentDropdownKey)

  const openShareMenu = openMenu(commentShareKey)

  it("should wrap all top-level comments in a div", () => {
    const wrapper = renderCommentTree()
    assert.equal(wrapper.find("div.top-level-comment").length, comments.length)
  })

  it("should render a share menu if it's open", () => {
    const wrapper = renderCommentTree(openShareMenu(comments[0]))
    assert.ok(wrapper.find(SharePopup).exists())
    const { url } = wrapper.find(SharePopup).props()
    assert.equal(url, permalinkFunc(comments[0].id))
  })

  it("should render all replies to a top-level comment", () => {
    const wrapper = renderCommentTree()
    const firstComment = wrapper.find(".top-level-comment").at(0)
    const replies = firstComment.find(".comment")
    const countReplies = R.compose(
      R.reduce((acc, val) => acc + countReplies(val), 1),
      R.prop("replies")
    )
    assert.equal(replies.length, countReplies(comments[0]))
  })

  it("should use markdown to render comments, should skip images", () => {
    comments[0].text = "# MARKDOWN!\n![](https://images.example.com/potato.jpg)"
    comments[0].edited = false
    const wrapper = renderCommentTree()
    const firstComment = wrapper
      .find(".top-level-comment")
      .at(0)
      .find(ReactMarkdown)

    assert.equal(
      firstComment
        .find(ReactMarkdown)
        .first()
        .props().source,
      comments[0].text
    )
    assert.lengthOf(firstComment.find("img"), 0)
  })

  it("should render a profile image", () => {
    const wrapper = renderCommentTree()
    const { src } = wrapper
      .find(".profile-image")
      .at(0)
      .props()
    assert.equal(src, comments[0].profile_image)
  })

  it("should put a className on replies, to allow for indentation", () => {
    const wrapper = renderCommentTree()
    const firstComment = wrapper.find(".top-level-comment").at(0)
    assert.ok(
      firstComment
        .find(".comment")
        .at(0)
        .hasClass("comment")
    )
    assert.ok(firstComment.find(".replies > .comment").at(0))
  })

  it('should include a "reply" button', () => {
    const wrapper = renderCommentTree()
    wrapper
      .find(".comment-action-button.reply-button")
      .at(0)
      .simulate("click")
    assert.ok(beginEditingStub.called)
    assert.ok(beginEditingStub.calledWith(replyToCommentKey(comments[0])))
  })

  it('should not include a "reply" button for deleted posts', () => {
    comments[0].deleted = true
    const wrapper = renderCommentTree()
    assert.notOk(
      wrapper
        .find(".top-level-comment .comment-actions")
        .at(0)
        .find(".comment-action-button.reply-button")
        .exists()
    )
  })

  it('should include a "report" button', () => {
    const wrapper = renderCommentTree(openDropdownMenu(comments[0]))
    wrapper
      .find(".comment-action-button.report-button")
      .at(0)
      .simulate("click", null)
    assert.ok(reportCommentStub.called)
    assert.ok(reportCommentStub.calledWith(comments[0]))
  })

  it("should hide the report button if userIsAnonymous", () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    assert.isNotOk(
      renderCommentTree()
        .find(".report-button")
        .exists()
    )
  })

  it('should hide the "report" button for anons', () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    assert.isNotOk(
      renderCommentTree()
        .find(".comment-action-button.report-button")
        .exists()
    )
  })

  it("should hide the 'follow' button for anons", () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    assert.isNotOk(
      renderCommentTree()
        .find(".comment-action-button.subscribe-comment")
        .exists()
    )
  })

  it('should include an "Edit" button, if the user wrote the comment', () => {
    SETTINGS.username = comments[0].author_id
    const wrapper = renderCommentTree(openDropdownMenu(comments[0]))
    wrapper.find(".edit-button").simulate("click")
    assert.ok(beginEditingStub.called)
    assert.ok(beginEditingStub.calledWith(editCommentKey(comments[0])))
    assert.deepEqual(beginEditingStub.args[0][1], comments[0])
  })

  //
  ;[[true, "unfollow"], [false, "follow"]].forEach(
    ([subscribed, buttonText]) => {
      it(`should include a ${buttonText} button when subscribed === ${subscribed}`, () => {
        comments[0].subscribed = subscribed
        const wrapper = renderCommentTree(openDropdownMenu(comments[0]))
        const button = wrapper.find(".subscribe-comment").at(0)
        assert.equal(button.text(), buttonText)
        button.simulate("click")
        assert.ok(toggleFollowCommentStub.called)
      })
    }
  )

  it("should include a 'delete' button, if the user wrote the comment", () => {
    SETTINGS.username = comments[0].author_id
    const wrapper = renderCommentTree(openDropdownMenu(comments[0]))
    const eventStub = {
      preventDefault: helper.sandbox.stub()
    }
    wrapper
      .find(".comment-action-button.delete-button")
      .props()
      .onClick(eventStub)
    assert.ok(deleteCommentStub.called)
    assert.ok(deleteCommentStub.calledWith(comments[0]))
    assert.ok(eventStub.preventDefault.called)
  })

  it("should not show a delete button, otherwise", () => {
    assert.isNotOk(
      renderCommentTree()
        .find(".delete-button")
        .exists()
    )
  })

  it("should include a permalink", () => {
    const button = renderCommentTree(openDropdownMenu(comments[0])).find(
      ".permalink-button"
    )
    assert(button.exists())
    assert.equal(
      button
        .find(Link)
        .at(0)
        .props().to,
      permalinkFunc(comments[0].id)
    )
  })

  it("should show the author name", () => {
    const wrapper = renderCommentTree()
    const authorName = wrapper
      .find(".comment")
      .at(0)
      .find(".author-name")
      .at(0)
      .text()
    assert.equal(authorName, comments[0].author_name)
  })

  it("should link to the author's profile", () => {
    const wrapper = renderCommentTree()
    const link = wrapper
      .find(".author-info")
      .at(0)
      .find("Link")
    assert.equal(link.text(), comments[0].author_name)
    assert.equal(link.props().to, profileURL(comments[0].author_id))
    const secondLink = wrapper
      .find(".comment")
      .at(0)
      .find("Link")
      .at(0)
    assert.equal(secondLink.props().to, profileURL(comments[0].author_id))
    assert(secondLink.find("ProfileImage").exists())
  })

  it("should limit replies to the max comment depth", () => {
    SETTINGS.max_comment_depth = 2

    // assert that there are at least three comments deep at index 0 for each one
    assert.ok(comments[0])
    assert.ok(comments[0].replies[0])
    assert.ok(comments[0].replies[0].replies[0])

    const wrapper = renderCommentTree()
    const topCommentWrapper = wrapper.find(".comment").first()
    const nextCommentWrapper = topCommentWrapper
      .find(".replies .comment")
      .first()

    assert.ok(topCommentWrapper.find(".reply-button").exists())
    assert.isNotOk(nextCommentWrapper.find(".reply-button").exists())

    assert.ok(topCommentWrapper.find(ReplyToCommentForm).exists())
    assert.isNotOk(nextCommentWrapper.find(ReplyToCommentForm).exists())

    assert.ok(topCommentWrapper.find(".replies").exists())
    assert.isNotOk(nextCommentWrapper.find(".replies").exists())
  })

  describe("moderation UI", () => {
    const moderationUI = true
    const isModerator = true
    let report
    beforeEach(() => {
      report = makeCommentReport(makePost())
    })

    it("should hide the reply button", () => {
      const wrapper = renderCommentTree({ moderationUI })
      assert.isNotOk(wrapper.find(".reply-button").exists())
    })

    it("should hide the report button", () => {
      const wrapper = renderCommentTree({ moderationUI })
      assert.isNotOk(wrapper.find(".report-button").exists())
    })

    it("should render top level comments as cards with moderationUI", () => {
      const wrapper = renderCommentTree({ moderationUI })
      assert.isOk(wrapper.find(Card).exists())
    })

    it("should include the report count if the user is a moderator", () => {
      const wrapper = renderCommentTree({
        isModerator,
        comments: [report.comment],
        ...openDropdownMenu(report.comment)
      })
      assert.ok(wrapper.find(".report-count").exists())
      assert.equal(wrapper.find(".report-count").text(), "Reports: 2")
    })

    it("should not render a report count, if comment has no report data", () => {
      const wrapper = renderCommentTree({ moderationUI })
      const count = wrapper.find(".report-count")
      assert.isNotOk(count.exists())
    })

    it("should include an ignoreCommentReports button if report and moderator", () => {
      const ignoreCommentReportsStub = helper.sandbox.stub()
      const wrapper = renderCommentTree({
        isModerator,
        ignoreCommentReports: ignoreCommentReportsStub,
        comments:             [report.comment],
        ...openDropdownMenu(report.comment)
      })
      const ignoreButton = wrapper.find(".ignore-button")
      assert.equal(ignoreButton.text(), "ignore all reports")
      const eventStub = {
        preventDefault: helper.sandbox.stub()
      }
      ignoreButton.props().onClick(eventStub)
      assert.ok(eventStub.preventDefault.called)
      assert.ok(ignoreCommentReportsStub.calledWith(report.comment))
    })
  })

  describe("more_comments", () => {
    it("should render a moreComments object at root level", async () => {
      const moreComments = makeMoreComments(post.id, null)
      comments.push(moreComments)
      const wrapper = renderCommentTree()

      const moreCommentsDiv = wrapper.find(
        ".top-level-comment > .more-comments"
      )
      assert.lengthOf(moreCommentsDiv, 1)

      await moreCommentsDiv
        .find("SpinnerButton")
        .props()
        .onClickPromise()
      sinon.assert.calledWith(loadMoreCommentsStub, moreComments)
    })

    it("should render under a parent comment", async () => {
      const moreComments = makeMoreComments(post.id, comments[0].id)
      comments[0].replies.push(moreComments)
      const wrapper = renderCommentTree()

      const moreCommentsDiv = wrapper.find(".replies > .more-comments")
      assert.lengthOf(moreCommentsDiv, 1)

      await moreCommentsDiv
        .find("SpinnerButton")
        .props()
        .onClickPromise()
      sinon.assert.calledWith(loadMoreCommentsStub, moreComments)
    })
  })
})

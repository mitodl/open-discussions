/* global SETTINGS */
import React from "react"
import sinon from "sinon"
import R from "ramda"
import { assert } from "chai"
import { shallow } from "enzyme"

import ReactMarkdown from "react-markdown"

import Card from "../components/Card"
import CommentTree from "./CommentTree"
import {
  ReplyToCommentForm,
  replyToCommentKey,
  editCommentKey
} from "./CommentForms"

import { makeCommentsResponse, makeMoreComments } from "../factories/comments"
import { makePost } from "../factories/posts"
import { createCommentTree } from "../reducers/comments"

describe("CommentTree", () => {
  let comments,
    post,
    sandbox,
    upvoteStub,
    downvoteStub,
    beginEditingStub,
    loadMoreCommentsStub

  beforeEach(() => {
    post = makePost()
    comments = createCommentTree(makeCommentsResponse(post))
    sandbox = sinon.sandbox.create()
    upvoteStub = sandbox.stub()
    downvoteStub = sandbox.stub()
    beginEditingStub = sandbox.stub()
    loadMoreCommentsStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderCommentTree = (props = {}) =>
    shallow(
      <CommentTree
        comments={comments}
        forms={{}}
        upvote={upvoteStub}
        downvote={downvoteStub}
        beginEditing={R.curry(beginEditingStub)}
        processing={false}
        loadMoreComments={loadMoreCommentsStub}
        {...props}
      />
    )

  it("should render all top-level comments as separate cards", () => {
    const wrapper = renderCommentTree()
    assert.equal(wrapper.find(Card).length, comments.length)
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
    const firstComment = wrapper.find(".top-level-comment").at(0)
    assert.equal(
      firstComment.find(ReactMarkdown).first().props().source,
      comments[0].text
    )
    assert.lengthOf(firstComment.find(".row img"), 0)
  })

  it("should render a profile image", () => {
    const wrapper = renderCommentTree()
    const { src } = wrapper.find(".profile-image").at(0).props()
    assert.equal(src, comments[0].profile_image)
  })

  it("should put a className on replies, to allow for indentation", () => {
    const wrapper = renderCommentTree()
    const firstComment = wrapper.find(".top-level-comment").at(0)
    assert.equal(
      firstComment.find(".comment").at(0).props().className,
      "comment"
    )
    assert.ok(firstComment.find(".replies > .comment").at(0))
  })

  it('should include a "reply" button', () => {
    const wrapper = renderCommentTree()
    wrapper.find(".comment-action-button").at(0).simulate("click")
    assert.ok(beginEditingStub.called)
    assert.ok(beginEditingStub.calledWith(replyToCommentKey(comments[0])))
  })

  it('should include an "Edit" button, if the user wrote the comment', () => {
    comments[0].author_id = "username"
    SETTINGS.username = "username"
    const wrapper = renderCommentTree()
    wrapper.find(".comment-action-button").at(1).simulate("click")
    assert.ok(beginEditingStub.called)
    assert.ok(beginEditingStub.calledWith(editCommentKey(comments[0])))
    assert.deepEqual(beginEditingStub.args[0][1], comments[0])
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

    assert.lengthOf(
      topCommentWrapper
        .find(".comment-actions")
        .at(0)
        .find(".comment-action-button"),
      1
    )
    assert.lengthOf(nextCommentWrapper.find(".comment-action-button"), 0)

    assert.lengthOf(topCommentWrapper.find(ReplyToCommentForm), 1)
    assert.lengthOf(nextCommentWrapper.find(ReplyToCommentForm), 0)

    assert.lengthOf(topCommentWrapper.find(".replies"), 1)
    assert.lengthOf(nextCommentWrapper.find(".replies"), 0)
  })

  describe("more_comments", () => {
    it("should render a moreComments object at root level", () => {
      const moreComments = makeMoreComments(post.id, null)
      comments.push(moreComments)
      const wrapper = renderCommentTree()

      const moreCommentsDiv = wrapper.find(
        ".top-level-comment > .more-comments"
      )
      assert.lengthOf(moreCommentsDiv, 1)

      moreCommentsDiv.find("a").simulate("click")
      sinon.assert.calledWith(loadMoreCommentsStub, moreComments)
    })

    it("should render under a parent comment", () => {
      const moreComments = makeMoreComments(post.id, comments[0].id)
      comments[0].replies.push(moreComments)
      const wrapper = renderCommentTree()

      const moreCommentsDiv = wrapper.find(".replies > .more-comments")
      assert.lengthOf(moreCommentsDiv, 1)

      moreCommentsDiv.find("a").simulate("click")
      sinon.assert.calledWith(loadMoreCommentsStub, moreComments)
    })
  })
})

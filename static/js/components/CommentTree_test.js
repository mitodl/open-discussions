// @flow
import React from "react"
import sinon from "sinon"
import R from "ramda"
import { assert } from "chai"
import { shallow } from "enzyme"

import ReactMarkdown from "react-markdown"

import Card from "../components/Card"
import CommentTree from "./CommentTree"

import { makeCommentTree } from "../factories/comments"
import { makePost } from "../factories/posts"
import { replyToCommentKey } from "../components/CreateCommentForm"

describe("CommentTree", () => {
  let comments, post, sandbox, upvoteStub, downvoteStub, beginReplyStub

  beforeEach(() => {
    post = makePost()
    comments = makeCommentTree(post)
    sandbox = sinon.sandbox.create()
    upvoteStub = sandbox.stub()
    downvoteStub = sandbox.stub()
    beginReplyStub = sandbox.stub()
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
        beginReply={R.curry((formKey, initialValue, e) => {
          beginReplyStub(formKey, initialValue, e)
        })}
        processing={false}
        {...props}
      />
    )

  it("should render all top-level comments as separate cards", () => {
    let wrapper = renderCommentTree()
    assert.equal(wrapper.find(Card).length, comments.length)
  })

  it("should render all replies to a top-level comment", () => {
    let wrapper = renderCommentTree()
    let firstComment = wrapper.find(".top-level-comment").at(0)
    let replies = firstComment.find(".comment")
    const countReplies = R.compose(
      R.reduce((acc, val) => acc + countReplies(val), 1),
      R.prop("replies")
    )
    assert.equal(replies.length, countReplies(comments[0]))
  })

  it("should use markdown to render comments, should skip images", () => {
    comments[0].text = "# MARKDOWN!\n![](https://images.example.com/potato.jpg)"
    let wrapper = renderCommentTree()
    let firstComment = wrapper.find(".top-level-comment").at(0)
    assert.equal(
      firstComment.find(ReactMarkdown).first().props().source,
      comments[0].text
    )
    assert.lengthOf(firstComment.find(".row img"), 0)
  })

  it("should render a profile image", () => {
    let wrapper = renderCommentTree()
    let { src } = wrapper.find(".profile-image").at(0).props()
    assert.equal(src, comments[0].profile_image)
  })

  it("should put a className on replies, to allow for indentation", () => {
    let wrapper = renderCommentTree()
    let firstComment = wrapper.find(".top-level-comment").at(0)
    assert.equal(
      firstComment.find(".comment").at(0).props().className,
      "comment"
    )
    assert.ok(firstComment.find(".replies > .comment").at(0))
  })

  it('should include a "reply" button', () => {
    let wrapper = renderCommentTree()
    wrapper.find(".reply-button").at(0).simulate("click")
    assert.ok(beginReplyStub.called)
    assert.ok(beginReplyStub.calledWith(replyToCommentKey(comments[0])))
  })
})

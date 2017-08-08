// @flow
import React from "react"
import sinon from "sinon"
import R from "ramda"
import { assert } from "chai"
import { shallow } from "enzyme"

import Card from "../components/Card"
import CommentTree from "./CommentTree"

import { makeCommentTree } from "../factories/comments"
import { makePost } from "../factories/posts"

describe("CommentTree", () => {
  let comments, post, sandbox, upvoteStub, downvoteStub

  beforeEach(() => {
    post = makePost()
    comments = makeCommentTree(post)
    sandbox = sinon.sandbox.create()
    upvoteStub = sandbox.stub()
    downvoteStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderCommentTree = (props = {}) =>
    shallow(<CommentTree comments={comments} forms={{}} upvote={upvoteStub} downvote={downvoteStub} {...props} />)

  it("should render all top-level comments as separate cards", () => {
    let wrapper = renderCommentTree()
    assert.equal(wrapper.find(Card).length, comments.length)
  })

  it("should render all replies to a top-level comment", () => {
    let wrapper = renderCommentTree()
    let firstComment = wrapper.find(".top-level-comment").at(0)
    let replies = firstComment.find(".comment")
    const countReplies = R.compose(R.reduce((acc, val) => acc + countReplies(val), 1), R.prop("replies"))
    assert.equal(replies.length, countReplies(comments[0]))
  })

  it("should put a className on replies, to allow for indentation", () => {
    let wrapper = renderCommentTree()
    let firstComment = wrapper.find(".top-level-comment").at(0)
    assert.equal(firstComment.find(".comment").at(0).props().className, "comment")
    assert.ok(firstComment.find(".replies > .comment").at(0))
  })

  it("should let the user click on the upvote button", () => {
    let firstCommentObj = comments[0]
    let wrapper = renderCommentTree()
    let firstComment = wrapper.find("CommentVoteForm").first()
    firstComment.find('.upvote').simulate('click')
    sinon.assert.calledWith(upvoteStub, firstCommentObj)
  })

  it("should let the user click on the downvote button", () => {
    let firstCommentObj = comments[0]
    let wrapper = renderCommentTree()
    let firstComment = wrapper.find("CommentVoteForm").first()
    firstComment.find('.downvote').simulate('click')
    sinon.assert.calledWith(downvoteStub, firstCommentObj)
  })
})

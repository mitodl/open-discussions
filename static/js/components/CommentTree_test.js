// @flow
import React from "react"
import R from "ramda"
import { assert } from "chai"
import { shallow } from "enzyme"

import Card from "../components/Card"
import CommentTree from "./CommentTree"

import { makeCommentTree } from "../factories/comments"
import { makePost } from "../factories/posts"

describe("CommentTree", () => {
  let comments, post

  beforeEach(() => {
    post = makePost()
    comments = makeCommentTree(post)
  })

  const renderCommentTree = comments => shallow(<CommentTree comments={comments} forms={{}} />)

  it("should render all top-level comments as separate cards", () => {
    let wrapper = renderCommentTree(comments)
    assert.equal(wrapper.find(Card).length, comments.length)
  })

  it("should render all replies to a top-level comment", () => {
    let wrapper = renderCommentTree(comments)
    let firstComment = wrapper.find(".top-level-comment").at(0)
    let replies = firstComment.find(".comment")
    const countReplies = R.compose(R.reduce((acc, val) => acc + countReplies(val), 1), R.prop("replies"))
    assert.equal(replies.length, countReplies(comments[0]))
  })

  it("should put a className on replies, to allow for indentation", () => {
    let wrapper = renderCommentTree(comments)
    let firstComment = wrapper.find(".top-level-comment").at(0)
    assert.equal(firstComment.find(".comment").at(0).props().className, "comment")
    assert.ok(firstComment.find(".replies > .comment").at(0))
  })
})

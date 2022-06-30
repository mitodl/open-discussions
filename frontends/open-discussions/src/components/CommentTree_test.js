/* global SETTINGS */
import React from "react"
import sinon from "sinon"
import R from "ramda"
import { assert } from "chai"
import { mount } from "enzyme"

import CommentTree from "./CommentTree"
import { commentPermalink } from "../lib/url"
import Router from "../Router"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeCommentsResponse, makeMoreComments } from "../factories/comments"
import { makePost } from "../factories/posts"
import { createCommentTree } from "../reducers/comments"

describe("CommentTree", () => {
  let comments, post, loadMoreCommentsStub, permalinkFunc, helper

  beforeEach(() => {
    post = makePost()
    helper = new IntegrationTestHelper()
    comments = createCommentTree(makeCommentsResponse(post))
    loadMoreCommentsStub = helper.sandbox.stub()
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
          processing={false}
          loadMoreComments={loadMoreCommentsStub}
          commentPermalink={permalinkFunc}
          isPrivateChannel={true}
          post={post}
          {...props}
        />
      </Router>
    )

  it("should pass basic props down to comments", () => {
    const comment = renderCommentTree().find("Comment").at(0)
    assert.deepEqual(comment.prop("post"), post)
    assert.deepEqual(comment.prop("commentPermalink"), permalinkFunc)
    assert.isTrue(comment.prop("isPrivateChannel"))
  })

  //
  ;[true, false].forEach(isModerator => {
    it(`should  pass isModerator = ${String(isModerator)} down`, () => {
      const comment = renderCommentTree({ isModerator }).find("Comment").at(0)
      assert.equal(comment.prop("isModerator"), isModerator)
    })
  })

  //
  ;[true, false].forEach(isPrivateChannel => {
    it(`should  pass isPrivateChannel = ${String(
      isPrivateChannel
    )} down`, () => {
      const comment = renderCommentTree({ isPrivateChannel })
        .find("Comment")
        .at(0)
      assert.equal(comment.prop("isPrivateChannel"), isPrivateChannel)
    })
  })

  it("should wrap all top-level comments in a div", () => {
    const wrapper = renderCommentTree()
    assert.equal(wrapper.find("div.top-level-comment").length, comments.length)
  })

  it("should render replies to a comment as children of that comment", () => {
    // no replies-to-replies, for simplicity
    comments[0].replies.map(comment => {
      comment.replies = []
    })
    const wrapper = renderCommentTree()
    const firstComment = wrapper
      .find(".top-level-comment")
      .at(0)
      .find("Comment")
      .at(0)
    const replies = firstComment.find(".replies").find("Comment")
    assert.equal(replies.length, comments[0].replies.length)
    R.zip(...replies, comments[0].replies).forEach(([wrapper, comment]) => {
      assert.deepEqual(wrapper.props.comment, comment)
    })
  })

  it("should limit replies to the max comment depth", () => {
    SETTINGS.max_comment_depth = 2

    // assert that there are at least three comments deep at index 0
    // these first two comments will be rendered
    assert.ok(comments[0])
    assert.ok(comments[0].replies[0])
    // this comment will not be rendered
    // because we stop rendering *at* the max comment depth
    assert.ok(comments[0].replies[0].replies[0])

    const wrapper = renderCommentTree()
    const topLevelComment = wrapper.find("Comment").first()
    const reply = topLevelComment.find(".replies").find("Comment").first()

    assert.isFalse(topLevelComment.prop("atMaxDepth"))
    assert.isTrue(reply.prop("atMaxDepth"))
    assert.isNotOk(reply.find(".replies").exists())
  })

  describe("more_comments", () => {
    it("should render a moreComments object at root level", async () => {
      const moreComments = makeMoreComments(post.id, null)
      comments.push(moreComments)
      const wrapper = renderCommentTree()

      const moreCommentsDiv = wrapper.find(
        ".top-level-comment > .more-comments"
      )
      assert.ok(moreCommentsDiv.exists())

      await moreCommentsDiv.find("SpinnerButton").props().onClickPromise()
      sinon.assert.calledWith(loadMoreCommentsStub, moreComments)
    })

    it("should render under a parent comment", async () => {
      const moreComments = makeMoreComments(post.id, comments[0].id)
      comments[0].replies.push(moreComments)
      const wrapper = renderCommentTree()

      const moreCommentsDiv = wrapper.find(".replies > .more-comments")
      assert.lengthOf(moreCommentsDiv, 1)

      await moreCommentsDiv.find("SpinnerButton").props().onClickPromise()
      sinon.assert.calledWith(loadMoreCommentsStub, moreComments)
    })
  })
})

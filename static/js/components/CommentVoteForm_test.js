// @flow
import React from 'react'
import sinon from 'sinon'
import { mount } from 'enzyme'

import { makePost } from '../factories/posts'
import { makeComment } from '../factories/comments'
import CommentVoteForm from './CommentVoteForm'

describe('CommentVoteForm', () => {
  let sandbox, upvoteStub, downvoteStub, comment

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    upvoteStub = sandbox.stub()
    downvoteStub = sandbox.stub()
    comment = makeComment(makePost())
  })

  afterEach(() => {
    sandbox.restore()
  })

  let renderForm = (props = {}) => mount(
    <CommentVoteForm
      comment={comment}
      upvote={upvoteStub}
      downvote={downvoteStub}
      {...props}
    />
  )

  it("should let the user click on the upvote button", () => {
    let wrapper = renderForm()
    let firstComment = wrapper.find("CommentVoteForm").first()
    firstComment.find('.upvote').simulate('click')
    sinon.assert.calledWith(upvoteStub, comment)
  })

  it("should let the user click on the downvote button", () => {
    let wrapper = renderForm()
    let firstComment = wrapper.find("CommentVoteForm").first()
    firstComment.find('.downvote').simulate('click')
    sinon.assert.calledWith(downvoteStub, comment)
  })
})

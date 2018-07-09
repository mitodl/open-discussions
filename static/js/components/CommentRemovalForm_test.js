// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"

import { wait } from "../lib/util"
import { makePost } from "../factories/posts"
import { makeComment } from "../factories/comments"
import CommentRemovalForm from "./CommentRemovalForm"

describe("CommentRemovalForm", () => {
  let sandbox, approveStub, removeStub, comment, resolveApprove, resolveRemove

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    // use promise which will never resolve
    approveStub = sandbox.stub().returns(
      new Promise(resolve => {
        resolveApprove = resolve
      })
    )
    removeStub = sandbox.stub().returns(
      new Promise(resolve => {
        resolveRemove = resolve
      })
    )
    comment = makeComment(makePost())
    comment.removed = false
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderForm = (isModerator: boolean = true) =>
    mount(
      <CommentRemovalForm
        comment={comment}
        approve={approveStub}
        remove={removeStub}
        isModerator={isModerator}
      />
    )

  const assertButton = (wrapper, isRemove) => {
    const availableActionSelector = isRemove
      ? ".remove-button"
      : ".approve-button"
    assert.isTrue(wrapper.find(availableActionSelector).exists())
  }

  it("does not display for non-moderator users", () => {
    const wrapper = renderForm(false)
    assert.isFalse(wrapper.find(".comment-action-button").exists())
  })
  ;[true, false].forEach(isRemove => {
    it(`clicks the ${isRemove ? "remove" : "approve"} button`, async () => {
      comment.removed = !isRemove
      const wrapper = renderForm()
      const actionStub = isRemove ? removeStub : approveStub

      assertButton(wrapper, isRemove)

      wrapper
        .find(isRemove ? ".remove-button" : ".approve-button")
        .simulate("click")
      sinon.assert.calledWith(actionStub, comment)

      if (isRemove) {
        resolveRemove()
        comment.removed = true
      } else {
        resolveApprove()
        comment.removed = false
      }

      wrapper.setProps({ comment })
      // wait for event loop to handle resolved promise
      await wait(10)
      assertButton(wrapper, !isRemove)
    })
  })
})

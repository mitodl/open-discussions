// @flow
import sinon from "sinon"
import { assert } from "chai"

import CommentRemovalForm from "./CommentRemovalForm"

import { wait } from "../lib/util"
import { makePost } from "../factories/posts"
import { makeComment } from "../factories/comments"
import { configureShallowRenderer } from "../lib/test_utils"

describe("CommentRemovalForm", () => {
  let sandbox,
    approveStub,
    removeStub,
    comment,
    resolveApprove,
    resolveRemove,
    renderForm

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
    renderForm = configureShallowRenderer(CommentRemovalForm, {
      comment,
      approve:     approveStub,
      remove:      removeStub,
      isModerator: true
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  const assertButton = (wrapper, isRemove) => {
    const availableActionSelector = isRemove
      ? ".remove-button"
      : ".approve-button"
    assert.isTrue(wrapper.find(availableActionSelector).exists())
  }

  it("does not display for non-moderator users", () => {
    const wrapper = renderForm({ isModerator: false })
    assert.isFalse(wrapper.find(".comment-action-button").exists())
  })

  //
  ;[true, false].forEach(isRemove => {
    it(`clicks the ${isRemove ? "remove" : "approve"} button`, async () => {
      comment.removed = !isRemove
      const wrapper = renderForm()
      const actionStub = isRemove ? removeStub : approveStub

      assertButton(wrapper, isRemove)

      const button = wrapper.find(
        isRemove ? ".remove-button" : ".approve-button"
      )

      const preventDefaultStub = sandbox.stub()
      button.props().onClick({
        preventDefault: preventDefaultStub
      })
      sinon.assert.called(preventDefaultStub)

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

// @flow
import React from "react"
import { shallow } from "enzyme"
import sinon from "sinon"
import { assert } from "chai"

import Dialog from "./Dialog"

describe("Dialog", () => {
  let sandbox,
    hideDialog,
    onCancel,
    onAccept,
    submitText,
    cancelText,
    title,
    id,
    className,
    open

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    hideDialog = sandbox.stub()
    onCancel = sandbox.stub()
    onAccept = sandbox.stub()
    title = "Dialog title"
    submitText = "Submit"
    cancelText = null
    className = "class"
    open = true
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) =>
    shallow(
      <Dialog
        open={open}
        hideDialog={hideDialog}
        // $FlowFixMe
        onCancel={onCancel}
        onAccept={onAccept}
        title={title}
        // $FlowFixMe
        submitText={submitText}
        // $FlowFixMe
        cancelText={cancelText}
        id={id}
        className={className}
        {...props}
      >
        Some Text Here
      </Dialog>
    )

  it("passes some props to the inner Dialog component", () => {
    const props = render().find("Dialog").props()
    assert.equal(props.id, id)
    assert.equal(props.onClose, hideDialog)
    assert.equal(props.open, open)
  })

  it("passes the title to DialogTitle", () => {
    assert.include(render().find("DialogTitle").dive().text(), title)
  })

  it("passes a className to the Dialog", () => {
    assert.equal(render().find("Dialog").prop("className"), className)
  })

  it("passes children to the DialogContent", () => {
    assert.equal(render().find("DialogContent").dive().text(), "Some Text Here")
  })

  describe("cancel button", () => {
    it("triggers the onCancel prop function", () => {
      render().find(".cancel").prop("onClick")("abc")
      sinon.assert.calledWith(onCancel, "abc")
    })

    it("triggers the hideDialog prop function if onCancel is blank", () => {
      onCancel = null
      render().find(".cancel").prop("onClick")("abc")
      sinon.assert.calledWith(hideDialog, "abc")
    })
  })

  describe("submit button", () => {
    it("triggers the onAccept prop function", () => {
      render().find(".submit").prop("onClick")("abc")
      sinon.assert.calledWith(onAccept, "abc")
    })

    it("shows the submit text", () => {
      assert.equal(render().find(".submit").text(), submitText)
    })

    it("shows default submit text if no submit text is provided", () => {
      submitText = null
      assert.equal(render().find(".submit").text(), "Accept")
    })

    it("shows the specified cancel text", () => {
      cancelText = "Exit"
      assert.equal(render().find(".cancel").text(), cancelText)
    })

    it("shows default cancel text if no cancel text is provided", () => {
      cancelText = null
      assert.equal(render().find(".cancel").text(), "Cancel")
    })

    it("hides the buttons if noButtons is true", () => {
      assert.isNotOk(render({ noButtons: true }).find("DialogActions").exists())
    })
  })
})

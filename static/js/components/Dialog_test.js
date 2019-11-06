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
    hideAccept,
    hideCancel,
    title,
    id,
    className,
    open

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    hideDialog = sandbox.stub()
    onCancel = sandbox.stub()
    onAccept = sandbox.stub()
    hideAccept = false
    hideCancel = false
    title = "Dialog title"
    submitText = "Submit"
    cancelText = null
    className = "class"
    open = true
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) => {
    const { children } = props
    return shallow(
      <Dialog
        open={open}
        hideDialog={hideDialog}
        hideAccept={hideAccept}
        hideCancel={hideCancel}
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
        {children}
      </Dialog>
    )
  }

  it("passes some props to the inner Dialog component", () => {
    const props = render()
      .find("Dialog")
      .props()
    assert.equal(props.id, id)
    assert.equal(props.onClose, hideDialog)
    assert.equal(props.open, open)
  })

  it("passes the title to DialogTitle", () => {
    assert.equal(
      render()
        .find("DialogTitle")
        .dive()
        .text(),
      title
    )
  })

  it("passes a className to the Dialog", () => {
    assert.equal(
      render()
        .find("Dialog")
        .prop("className"),
      className
    )
  })

  it("passes children to the DialogContent", () => {
    const children = "Some text here"
    assert.equal(
      render({ children })
        .find("DialogContent")
        .dive()
        .text(),
      children
    )
  })

  describe("cancel button", () => {
    it("triggers the onCancel prop function", () => {
      render()
        .find(".cancel")
        .prop("onClick")("abc")
      sinon.assert.calledWith(onCancel, "abc")
    })

    it("triggers the hideDialog prop function if onCancel is blank", () => {
      onCancel = null
      render()
        .find(".cancel")
        .prop("onClick")("abc")
      sinon.assert.calledWith(hideDialog, "abc")
    })
  })

  describe("submit button", () => {
    it("triggers the onAccept prop function", () => {
      render()
        .find(".submit")
        .prop("onClick")("abc")
      sinon.assert.calledWith(onAccept, "abc")
    })

    it("shows the submit text", () => {
      assert.equal(
        render()
          .find(".submit")
          .text(),
        submitText
      )
    })

    it("shows default submit text if no submit text is provided", () => {
      submitText = null
      assert.equal(
        render()
          .find(".submit")
          .text(),
        "Accept"
      )
    })

    it("shows the specified cancel text", () => {
      cancelText = "Exit"
      assert.equal(
        render()
          .find(".cancel")
          .text(),
        cancelText
      )
    })

    it("shows default cancel text if no cancel text is provided", () => {
      cancelText = null
      assert.equal(
        render()
          .find(".cancel")
          .text(),
        "Cancel"
      )
    })

    it("hides the Accept button if hideAccept is true", () => {
      hideAccept = true
      assert.isNotOk(
        render()
          .find(".submit")
          .exists()
      )
    })

    it("hides the Cancel button if hideCancel is true", () => {
      hideCancel = true
      assert.isNotOk(
        render()
          .find(".cancel")
          .exists()
      )
    })
  })
})

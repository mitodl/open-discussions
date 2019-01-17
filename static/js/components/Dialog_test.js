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
        // $FlowFixMe
        onCancel={onCancel}
        onAccept={onAccept}
        title={title}
        // $FlowFixMe
        submitText={submitText}
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

  it("passes the title to DialogHeaderTitle", () => {
    assert.equal(
      render()
        .find("DialogHeaderTitle")
        .dive()
        .text(),
      title
    )
  })

  it("passes a className to the DialogSurface", () => {
    assert.equal(
      render()
        .find("DialogSurface")
        .prop("className"),
      className
    )
  })

  it("passes children to the DialogBody", () => {
    const children = "Some text here"
    assert.equal(
      render({ children })
        .find("DialogBody")
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
  })
})

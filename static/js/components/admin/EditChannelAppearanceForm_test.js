// @flow
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import EditChannelAppearanceForm from "./EditChannelAppearanceForm"
import { editChannelForm } from "../../lib/channels"
import { makeChannel } from "../../factories/channels"

import type { ChannelForm } from "../../flow/discussionTypes"

describe("EditChannelAppearanceForm", () => {
  const renderForm = (
    form: ChannelForm,
    { onSubmit, onUpdate } = { onSubmit: () => {}, onUpdate: () => {} }
  ) =>
    shallow(
      <EditChannelAppearanceForm
        form={form}
        onSubmit={onSubmit}
        onUpdate={onUpdate}
        validation={{ title: "", description: "", public_description: "" }}
        history={{}}
        processing={false}
      />
    )
  let sandbox, form

  beforeEach(() => {
    form = editChannelForm(makeChannel())
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should render a blank form", () => {
    const wrapper = renderForm(form)
    // $FlowFixMe
    const [description] = wrapper.find("textarea")
    assert.equal(description.props.value, form.description)
  })

  describe("callbacks", () => {
    let wrapper, onSubmit, onUpdate
    beforeEach(() => {
      [onSubmit, onUpdate] = [sandbox.stub(), sandbox.stub()]
      wrapper = renderForm(form, { onSubmit, onUpdate })
    })

    describe("onSubmit", () => {
      it("should be called when form is submitted", () => {
        assert.isNotOk(onSubmit.called)
        wrapper.find("form").simulate("submit")
        assert.isOk(onSubmit.called)
        assert.isNotOk(onUpdate.called)
      })
    })

    describe("onUpdate", () => {
      it(`should be called when description input is modified`, () => {
        const event = { target: { value: "text" } }
        assert.isNotOk(onSubmit.called)
        wrapper.find(`[name="description"]`).simulate("change", event)
        assert.isOk(onUpdate.calledWith(event))
      })
    })
  })
})

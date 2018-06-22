import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import EditChannelBasicForm from "./EditChannelBasicForm"
import {
  CHANNEL_TYPE_PUBLIC,
  CHANNEL_TYPE_PRIVATE,
  CHANNEL_TYPE_RESTRICTED,
  editChannelForm
} from "../../lib/channels"
import { makeChannel } from "../../factories/channels"

import type { ChannelForm } from "../../flow/discussionTypes"

describe("EditChannelBasicForm", () => {
  const renderForm = (
    form: ChannelForm,
    { onSubmit, onUpdate } = { onSubmit: () => {}, onUpdate: () => {} }
  ) =>
    shallow(
      <EditChannelBasicForm
        form={form}
        onSubmit={onSubmit}
        onUpdate={onUpdate}
        validation={{}}
      />
    )
  let sandbox, form

  beforeEach(() => {
    form = editChannelForm(makeChannel())
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should render a blank form", () => {
    const wrapper = renderForm(form)
    const [publicOption, restrictedOption, privateOption] = wrapper.find(
      '[name="channel_type"]'
    )
    assert.equal(publicOption.props.value, CHANNEL_TYPE_PUBLIC)
    assert.equal(publicOption.props.checked, true)
    assert.equal(restrictedOption.props.value, CHANNEL_TYPE_RESTRICTED)
    assert.equal(restrictedOption.props.checked, false)
    assert.equal(privateOption.props.value, CHANNEL_TYPE_PRIVATE)
    assert.equal(privateOption.props.checked, false)
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
      it(`should be called when input is modified`, () => {
        const event = { target: { value: "text" } }
        assert.isNotOk(onSubmit.called)
        wrapper
          .find(`[name="channel_type"]`)
          .at(0)
          .simulate("change", event)
        assert.isOk(onUpdate.calledWith(event))
      })
    })
  })
})

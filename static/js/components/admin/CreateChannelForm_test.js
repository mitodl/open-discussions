import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import CreateChannelForm from "./CreateChannelForm"
import {
  CHANNEL_TYPE_PUBLIC,
  CHANNEL_TYPE_PRIVATE,
  newChannelForm
} from "../../lib/channels"

import type { ChannelForm } from "../../flow/discussionTypes"

describe("CreateChannelForm", () => {
  const renderForm = (
    form: ChannelForm,
    { onSubmit, onUpdate } = { onSubmit: () => {}, onUpdate: () => {} }
  ) =>
    shallow(
      <CreateChannelForm form={form} onSubmit={onSubmit} onUpdate={onUpdate} />
    )
  let sandbox, form

  beforeEach(() => {
    form = newChannelForm()
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should render a blank form", () => {
    const wrapper = renderForm(form)
    const [title, name] = wrapper.find('input[type="text"]')
    const [description] = wrapper.find("textarea")
    const [radioPublic, radioPrivate] = wrapper.find('input[type="radio"]')
    assert.equal(title.props.value, "")
    assert.equal(name.props.value, "")
    assert.equal(description.props.value, "")
    assert.equal(radioPublic.props.value, CHANNEL_TYPE_PUBLIC)
    assert.equal(radioPublic.props.checked, true)
    assert.equal(radioPrivate.props.value, CHANNEL_TYPE_PRIVATE)
    assert.equal(radioPrivate.props.checked, false)
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
      for (const inputName of ["title", "name", "description"]) {
        it(`should be called when ${inputName} input is modified`, () => {
          const event = { target: { value: "text" } }
          assert.isNotOk(onSubmit.called)
          wrapper.find(`[name="${inputName}"]`).simulate("change", event)
          assert.isOk(onUpdate.calledWith(event))
        })
      }

      for (const channelType of [CHANNEL_TYPE_PRIVATE, CHANNEL_TYPE_PUBLIC]) {
        it(`should be called when ${channelType} channel_type is clicked`, () => {
          const event = { target: { value: channelType } }
          assert.isNotOk(onSubmit.called)
          wrapper.find(`#channel_${channelType}`).simulate("change", event)
          assert.isOk(onUpdate.calledWith(event))
        })
      }
    })
  })
})

// @flow
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import ChannelEditForm from "./ChannelEditForm"
import { CHANNEL_TYPE_PUBLIC, CHANNEL_TYPE_PRIVATE, newChannel } from "../../lib/channels"

import type { Channel } from "../../flow/discussionTypes"

describe("ChannelEditForm", () => {
  const renderForm = (channel: ?Channel, { onSubmit, onUpdate } = { onSubmit: () => {}, onUpdate: () => {} }) =>
    shallow(<ChannelEditForm channel={channel} onSubmit={onSubmit} onUpdate={onUpdate} />)
  let sandbox, channel

  beforeEach(() => {
    channel = newChannel()
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should render nothing if no channel", () => {
    assert.equal(renderForm(null).html(), null)
  })

  it("should render a blank form", () => {
    let wrapper = renderForm(channel)
    let [title, name] = wrapper.find('input[type="text"]')
    let [description] = wrapper.find("textarea")
    let [radioPublic, radioPrivate] = wrapper.find('input[type="radio"]')
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
      wrapper = renderForm(channel, { onSubmit, onUpdate })
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
      for (let inputName of ["title", "name", "public_description"]) {
        it(`should be called when ${inputName} input is modified`, () => {
          let event = { target: { value: "text" } }
          assert.isNotOk(onSubmit.called)
          wrapper.find(`[name="${inputName}"]`).simulate("change", event)
          assert.isOk(onUpdate.calledWith(event))
        })
      }

      for (let channelType of [CHANNEL_TYPE_PRIVATE, CHANNEL_TYPE_PUBLIC]) {
        it(`should be called when ${channelType} channel_type is clicked`, () => {
          let event = { target: { value: channelType } }
          assert.isNotOk(onSubmit.called)
          wrapper.find(`#channel_${channelType}`).simulate("change", event)
          assert.isOk(onUpdate.calledWith(event))
        })
      }
    })
  })
})

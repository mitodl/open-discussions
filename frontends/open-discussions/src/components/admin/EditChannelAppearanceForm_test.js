import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"
import { createMemoryHistory } from "history"

import EditChannelAppearanceForm from "./EditChannelAppearanceForm"
import { editChannelForm } from "../../lib/channels"
import { channelURL } from "../../lib/url"
import { makeChannel, makeImage } from "../../factories/channels"

import type { ChannelForm } from "../../flow/discussionTypes"

describe("EditChannelAppearanceForm", () => {
  const renderForm = (
    form: ChannelForm,
    { onSubmit, onUpdate } = { onSubmit: () => {}, onUpdate: () => {} }
  ) =>
    shallow(
      <EditChannelAppearanceForm
        channel={channel}
        form={form}
        onSubmit={onSubmit}
        onUpdate={onUpdate}
        validation={{ title: "", description: "", public_description: "" }}
        history={history}
        processing={false}
      />
    )
  let sandbox, history, form, channel

  beforeEach(() => {
    channel = makeChannel()
    form = editChannelForm(channel)
    sandbox = sinon.createSandbox()
    history = createMemoryHistory()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should render a form with values", () => {
    const wrapper = renderForm(form)
    assert.equal(
      wrapper.find("input[name='public_description']").props().value,
      form.public_description
    )
    assert.equal(wrapper.find("input[name='title']").props().value, form.title)
  })

  it("should redirect to the channel page on cancel", () => {
    const wrapper = renderForm(form)
    let currentUrl = null
    history.listen(newUrl => {
      currentUrl = newUrl
    })
    wrapper.find(".cancel").props().onClick()
    assert.equal(currentUrl.pathname, channelURL(channel.name))
  })

  describe("callbacks", () => {
    let onSubmit, onUpdate

    beforeEach(() => {
      [onSubmit, onUpdate] = [sandbox.stub(), sandbox.stub()]
    })

    describe("onSubmit", () => {
      it("should be called when form is submitted", () => {
        const wrapper = renderForm(form, { onSubmit, onUpdate })
        assert.isNotOk(onSubmit.called)
        wrapper.find("form").simulate("submit")
        assert.isOk(onSubmit.called)
        assert.isNotOk(onUpdate.called)
      })
    })

    describe("onUpdate", () => {
      it(`should be called when the headline is modified`, () => {
        const wrapper = renderForm(form, { onSubmit, onUpdate })
        const event = { target: { value: "text" } }
        assert.isNotOk(onSubmit.called)
        wrapper.find(`[name="public_description"]`).simulate("change", event)
        assert.isOk(onUpdate.calledWith(event))
      })

      it(`should be called when the title is modified`, () => {
        const wrapper = renderForm(form, { onSubmit, onUpdate })
        const event = { target: { value: "text" } }
        assert.isNotOk(onSubmit.called)
        wrapper.find(`[name="title"]`).simulate("change", event)
        assert.isOk(onUpdate.calledWith(event))
      })

      //
      ;["avatar", "banner"].forEach(field => {
        [true, false].forEach(hasEdit => {
          it(`should modify the ${field} when the blob ${
            hasEdit ? "exists" : "doesn't exist"
          }`, () => {
            const blobUrl = `blob_url_${field}`
            const onUpdate = "onUpdateFunc"
            sandbox.stub(URL, "createObjectURL").returns(blobUrl)

            form[field] = makeImage(field)
            if (!hasEdit) {
              form[field].edit = null
            }
            const wrapper = renderForm(form, { onSubmit, onUpdate })
            const image = wrapper.find(`[name="${field}"]`)
            const props = image.props()
            assert.isTrue(props.editable)
            assert.deepEqual(props.channel, channel)
            assert.equal(props.channelName, channel.name)
            assert.equal(props.name, field)
            assert.equal(props.onUpdate, onUpdate)

            if (hasEdit) {
              assert.equal(props.formImageUrl, blobUrl)
              sinon.assert.calledWith(URL.createObjectURL, form[field].edit)
            } else {
              assert.equal(props.formImageUrl, undefined)
              assert.isFalse(URL.createObjectURL.called)
            }
          })
        })
      })
    })
  })
})

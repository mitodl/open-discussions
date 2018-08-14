// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"

import IntegrationTestHelper from "../util/integration_test_helper"
import ChannelAvatar from "./ChannelAvatar"
import * as uiActions from "../actions/ui"
import { initials } from "../lib/profile"

import { makeChannel } from "../factories/channels"

const DEFAULT_STATE = {}

describe("ChannelAvatar", () => {
  let helper, renderPage, channel

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    renderPage = helper.configureHOCRenderer(
      ChannelAvatar,
      "ChannelAvatar",
      DEFAULT_STATE
    )
    channel = makeChannel()
    channel.avatar = null
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("renders an image when there is an avatar", async () => {
    channel.avatar = "avatar"
    const { inner } = await renderPage({}, { channel })

    assert.equal(
      inner.find("img").props().alt,
      `Channel avatar for ${channel.name}`
    )
    assert.equal(inner.find("img").props().src, channel.avatar)
    assert.equal(inner.find(".avatar-initials").length, 0)
  })

  it("renders initials when there isn't an avatar", async () => {
    channel.avatar = null
    const { inner } = await renderPage({}, { channel })

    assert.equal(inner.find("img").length, 0)
    assert.equal(inner.find(".avatar-initials").text(), initials(channel.title))
  })
  ;[true, false].forEach(editable => {
    it(`${
      editable ? "renders" : "doesn't render"
    } an ImageUploader and link`, async () => {
      const { inner } = await renderPage({}, { channel, editable })
      assert.equal(
        inner.find("Connect(withForm(ImageUploader))").length,
        editable ? 1 : 0
      )

      assert.equal(inner.find(".upload-avatar").length, editable ? 1 : 0)
    })
  })

  describe(`shows the right icon when the channel`, () => {
    [true, false].forEach(hasAvatar => {
      it(`${hasAvatar ? "has" : "doesn't have"} a avatar`, async () => {
        channel.avatar = hasAvatar ? "avatar" : null
        const { inner } = await renderPage({}, { channel, editable: true })
        const imageUploader = inner.find("Connect(withForm(ImageUploader))")
        assert.equal(imageUploader.props().isAdd, !hasAvatar)
      })
    })
    ;[true, false].forEach(hasFormImageUrl => {
      it(`${
        hasFormImageUrl ? "provides" : "doesn't provide"
      } a formImageUrl`, async () => {
        const { inner } = await renderPage(
          {},
          {
            channel,
            editable:     true,
            formImageUrl: hasFormImageUrl ? "url" : null
          }
        )
        const imageUploader = inner.find("Connect(withForm(ImageUploader))")
        assert.equal(imageUploader.props().isAdd, !hasFormImageUrl)
      })
    })
  })
  ;["name", "onUpdate"].forEach(field => {
    it(`passes in ${field}`, async () => {
      const value = field
      const { inner } = await renderPage(
        {},
        { channel, [field]: value, editable: true }
      )
      const imageUploader = inner.find("Connect(withForm(ImageUploader))")
      assert.equal(imageUploader.props()[field], value)
    })
  })

  it("has a link to upload avatar which shows the dialog", async () => {
    const showDialogStub = helper.sandbox
      .stub(uiActions, "showDialog")
      .returns({ type: "action" })
    const { inner } = await renderPage({}, { channel, editable: true })
    const imageUploader = inner.find(".upload-avatar")
    imageUploader.props().onClick()
    sinon.assert.calledWith(showDialogStub)
  })
})

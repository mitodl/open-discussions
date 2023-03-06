// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"

import IntegrationTestHelper from "../util/integration_test_helper"
import ChannelBanner from "./ChannelBanner"
import * as uiActions from "../actions/ui"
import { Gradient } from "./PageBanner"

import { makeChannel } from "../factories/channels"

const DEFAULT_STATE = {}

describe("ChannelBanner", () => {
  let helper, renderPage, channel

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    renderPage = helper.configureHOCRenderer(
      ChannelBanner,
      "ChannelBanner",
      DEFAULT_STATE
    )
    channel = makeChannel()
    channel.banner = null
  })

  afterEach(() => {
    helper.cleanup()
  })

  //
  ;[true, false].forEach(hasBanner => {
    it(`${hasBanner ? "renders" : "doesn't render"} an image`, async () => {
      channel.banner = hasBanner ? "channel" : null

      const { inner } = await renderPage({}, { channel })
      assert.ok(inner.find(Gradient).exists())
      const image = inner.find("BannerImage")
      assert.equal(image.props().src, channel.banner)
      assert.equal(image.props().alt, `Channel banner for ${channel.name}`)
    })
  })

  //
  ;[true, false].forEach(editable => {
    it(`${
      editable ? "renders" : "doesn't render"
    } an ImageUploader and link`, async () => {
      const { inner } = await renderPage({}, { channel, editable })
      assert.equal(
        inner.find("Connect(withForm(ImageUploader))").length,
        editable ? 1 : 0
      )
      assert.equal(inner.find(".upload-banner").length, editable ? 1 : 0)
    })
  })

  describe(`shows the right icon when the channel`, () => {
    [true, false].forEach(hasBanner => {
      it(`${hasBanner ? "has" : "doesn't have"} a banner`, async () => {
        channel.banner = hasBanner ? "banner" : null
        const { inner } = await renderPage({}, { channel, editable: true })
        const imageUploader = inner.find("Connect(withForm(ImageUploader))")
        assert.equal(imageUploader.props().isAdd, !hasBanner)
      })
    })

    //
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

  //
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

  it("has a link to upload banner which shows the dialog", async () => {
    const showDialogStub = helper.sandbox
      .stub(uiActions, "showDialog")
      .returns({ type: "action" })
    const { inner } = await renderPage({}, { channel, editable: true })
    const imageUploader = inner.find(".upload-banner")
    imageUploader.props().onClick()
    sinon.assert.calledWith(showDialogStub)
  })
})

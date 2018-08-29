// @flow
/* global SETTINGS: false */
import { assert } from "chai"

import ChannelAvatar from "./ChannelAvatar"

import { makeChannel } from "../factories/channels"
import { initials } from "../lib/profile"
import IntegrationTestHelper from "../util/integration_test_helper"

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
    channel.avatar_small = null
    channel.avatar_medium = null
  })

  afterEach(() => {
    helper.cleanup()
  })
  ;["small", "medium"].forEach(imageSize => {
    describe(imageSize, () => {
      it("renders an image when there is an avatar", async () => {
        channel.avatar_small = "avatar_small"
        channel.avatar_medium = "avatar_medium"
        const { inner } = await renderPage({}, { channel, imageSize })

        assert.equal(
          inner.find("img").props().alt,
          `Channel avatar for ${channel.name}`
        )
        assert.equal(
          inner.find("img").props().src,
          channel[`avatar_${imageSize}`]
        )
        assert.equal(inner.find(".avatar-initials").length, 0)
      })

      it("renders initials when there isn't an avatar", async () => {
        channel.avatar_medium = null
        channel.avatar_small = null
        const { inner } = await renderPage({}, { channel, imageSize })

        assert.equal(inner.find("img").length, 0)
        assert.equal(
          inner.find(".avatar-initials").text(),
          initials(channel.title)
        )
      })
      ;[true, false].forEach(editable => {
        it(`${
          editable ? "renders" : "doesn't render"
        } an ImageUploader`, async () => {
          const { inner } = await renderPage(
            {},
            { channel, editable, imageSize }
          )
          assert.equal(
            inner.find("Connect(withForm(ImageUploader))").length,
            editable ? 1 : 0
          )
        })
      })

      describe(`shows the right icon when the channel`, () => {
        [true, false].forEach(hasAvatar => {
          it(`${hasAvatar ? "has" : "doesn't have"} a avatar`, async () => {
            channel[`avatar_${imageSize}`] = hasAvatar ? "avatar" : null
            const { inner } = await renderPage(
              {},
              { channel, editable: true, imageSize }
            )
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
                imageSize,
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
            { channel, [field]: value, editable: true, imageSize }
          )
          const imageUploader = inner.find("Connect(withForm(ImageUploader))")
          assert.equal(imageUploader.props()[field], value)
        })
      })

      it("has a link to upload avatar which shows the dialog", async () => {
        const { inner } = await renderPage(
          {},
          { channel, editable: true, imageSize }
        )

        assert.isTrue(
          inner.find("Connect(withForm(ImageUploader))").props().showButton
        )
      })
    })
  })
})

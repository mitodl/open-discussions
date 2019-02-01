// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"

import EditChannelAppearancePage, {
  EditChannelAppearancePage as InnerEditChannelAppearancePage
} from "./EditChannelAppearancePage"

import { makeChannel, makeImage } from "../../factories/channels"
import { actions } from "../../actions"
import { formatTitle } from "../../lib/title"
import { channelURL } from "../../lib/url"
import * as validationFuncs from "../../lib/validation"
import { shouldIf, isIf } from "../../lib/test_utils"
import IntegrationTestHelper from "../../util/integration_test_helper"
import { EDIT_CHANNEL_KEY } from "../../lib/channels"

describe("EditChannelAppearancePage", () => {
  let helper, render, channel, initialState, initialProps

  beforeEach(() => {
    channel = makeChannel()
    helper = new IntegrationTestHelper()
    initialState = {
      channels: {
        data:       new Map([[channel.name, channel]]),
        processing: false
      },
      channelAvatar: {
        processing: false
      },
      channelBanner: {
        processing: false
      },
      forms: {
        [EDIT_CHANNEL_KEY]: {
          value: {
            name: channel.name
          },
          errors: {}
        }
      }
    }
    initialProps = {
      match: {
        params: {
          channelName: channel.name
        }
      },
      history: helper.browserHistory
    }
    render = helper.configureHOCRenderer(
      EditChannelAppearancePage,
      InnerEditChannelAppearancePage,
      initialState,
      initialProps
    )

    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.updateChannelStub.returns(Promise.resolve(channel))
    helper.patchChannelAvatarStub.returns(Promise.resolve())
    helper.patchChannelBannerStub.returns(Promise.resolve())
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("passes proper props", async () => {
    const value = { a: "value" }
    const errors = { some: "errors" }
    const { inner } = await render({
      forms: {
        [EDIT_CHANNEL_KEY]: {
          value:  value,
          errors: errors
        }
      },
      channels: {
        processing: "processing"
      }
    })
    const props = inner.find("EditChannelAppearanceForm").props()
    assert.deepEqual(props.channel, channel)
    assert.deepEqual(props.form, {
      name: channel.name,
      ...value
    })
    assert.deepEqual(props.history, helper.browserHistory)
    assert.deepEqual(props.validation, errors)
    assert.equal(props.processing, "processing")
  })
  ;[
    [true, true, true, true],
    [true, true, false, true],
    [true, false, true, true],
    [true, false, false, true],
    [false, true, true, true],
    [false, true, false, true],
    [false, false, true, true],
    [false, false, false, false]
  ].forEach(([page, avatar, banner, expected]) => {
    it(`is ${expected ? "" : "not "}processing when page processing=${String(
      page
    )}, avatar processing=${String(avatar)}, and banner processing=${String(
      banner
    )}`, async () => {
      const { inner } = await render({
        channels:      { processing: page },
        channelAvatar: { processing: avatar },
        channelBanner: { processing: banner }
      })

      const props = inner.find("EditChannelAppearanceForm").props()
      assert.equal(props.processing, expected)
    })
  })

  it("should set the document title", async () => {
    const { inner } = await render()
    assert.equal(inner.find("title").text(), formatTitle("Edit Channel"))
  })

  it("should set a field value on the form when onUpdate is called", async () => {
    const { inner, store } = await render()

    const props = inner.find("EditChannelAppearanceForm").props()
    props.onUpdate({
      target: {
        name:  "description name",
        value: "description value"
      }
    })

    const dispatchedActions = store.getActions()

    assert.lengthOf(dispatchedActions, 2)
    assert.deepEqual(dispatchedActions[1], {
      type:    actions.forms.FORM_UPDATE,
      payload: {
        formKey: EDIT_CHANNEL_KEY,
        value:   {
          ["description name"]: "description value"
        }
      }
    })
  })

  describe("onSubmit", () => {
    [[true, true], [true, false], [false, true], [false, false]].forEach(
      ([hasAvatar, hasBanner]) => {
        it(`submits the form${hasAvatar ? " with an avatar" : ""}${
          hasBanner ? " with a banner" : ""
        }`, async () => {
          const avatar = makeImage("avatar")
          const banner = makeImage("banner")

          const { inner } = await render({
            forms: {
              [EDIT_CHANNEL_KEY]: {
                value: {
                  description: "a description",
                  avatar:      hasAvatar ? avatar : null,
                  banner:      hasBanner ? banner : null
                }
              }
            }
          })
          await inner
            .find("EditChannelAppearanceForm")
            .props()
            .onSubmit({ preventDefault: helper.sandbox.stub() })

          sinon.assert.calledWith(helper.updateChannelStub, {
            name:        channel.name,
            description: "a description"
          })
          if (hasAvatar) {
            sinon.assert.calledWith(
              helper.patchChannelAvatarStub,
              channel.name,
              avatar.edit,
              avatar.image.name
            )
          } else {
            assert.isFalse(helper.patchChannelAvatarStub.called)
          }
          if (hasBanner) {
            sinon.assert.calledWith(
              helper.patchChannelBannerStub,
              channel.name,
              banner.edit,
              banner.image.name
            )
          } else {
            assert.isFalse(helper.patchChannelBannerStub.called)
          }
          assert.equal(
            helper.currentLocation.pathname,
            channelURL(channel.name)
          )
        })
      }
    )
    ;[[true, true], [false, false]].forEach(([isAdmin, expectIncludeTitle]) => {
      it(`${shouldIf(
        expectIncludeTitle
      )} send patch request with title if user ${isIf(
        isAdmin
      )} an admin`, async () => {
        SETTINGS.is_admin = isAdmin
        const { inner } = await render({
          forms: {
            [EDIT_CHANNEL_KEY]: {
              value: {
                description: "a description",
                title:       "a title"
              }
            }
          }
        })
        await inner
          .find("EditChannelAppearanceForm")
          .props()
          .onSubmit({ preventDefault: helper.sandbox.stub() })

        sinon.assert.calledOnce(helper.updateChannelStub)
        const channelUpdateArg = helper.updateChannelStub.firstCall.args[0]
        assert.equal(
          channelUpdateArg.hasOwnProperty("title"),
          expectIncludeTitle
        )
      })
    })

    it("doesn't submit if there's a validation error", async () => {
      helper.sandbox
        .stub(validationFuncs, "validateChannelAppearanceEditForm")
        .returns({ value: "problem" })
      const { inner, store } = await render()
      helper.updateChannelStub.returns(Promise.resolve(channel))
      await inner
        .find("EditChannelAppearanceForm")
        .props()
        .onSubmit({ preventDefault: helper.sandbox.stub() })

      assert.isFalse(helper.updateChannelStub.called)
      assert.isFalse(helper.patchChannelAvatarStub.called)
      assert.isFalse(helper.patchChannelBannerStub.called)
      assert.equal(helper.currentLocation, null)
      const storeActions = store.getActions()
      assert.lengthOf(storeActions, 2)
      assert.deepEqual(storeActions[storeActions.length - 1], {
        type:    actions.forms.FORM_VALIDATE,
        payload: {
          errors:  "problem",
          formKey: EDIT_CHANNEL_KEY
        }
      })
    })
  })

  it("has a channel header", async () => {
    render = helper.configureHOCRenderer(
      EditChannelAppearancePage,
      "withChannelHeader(WithSingleColumn)",
      initialState,
      initialProps
    )

    const { inner } = await render()
    assert.isTrue(inner.find("ChannelHeader").exists())
  })
})

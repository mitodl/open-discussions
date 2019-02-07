/* global SETTINGS */
// @flow
import { assert } from "chai"

import ChannelSettingsLink, {
  CHANNEL_SETTINGS_MENU_DROPDOWN,
  ChannelSettingsLink as InnerChannelSettingsLink
} from "./ChannelSettingsLink"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannel } from "../factories/channels"
import { channelURL, editChannelBasicURL } from "../lib/url"
import { FORM_BEGIN_EDIT } from "../actions/forms"
import { WIDGET_FORM_KEY } from "../lib/widgets"

describe("ChannelSettingsLink", () => {
  let helper, render, dropdownMenus, channel

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    dropdownMenus = new Set()
    channel = makeChannel()
    render = helper.configureHOCRenderer(
      ChannelSettingsLink,
      InnerChannelSettingsLink,
      {
        ui: {
          dropdownMenus
        }
      },
      {
        channel
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("dropdown menu", () => {
    [true, false].forEach(isOpen => {
      it(`renders a ${isOpen ? "visible" : "hidden"} menu`, async () => {
        if (isOpen) {
          dropdownMenus.add(CHANNEL_SETTINGS_MENU_DROPDOWN)
        }
        const { inner } = await render()
        assert.equal(
          inner.find("OnClickOutside(_DropdownMenu)").exists(),
          isOpen
        )
      })
    })
    ;[true, false].forEach(isOpen => {
      it(`toggles the menu state to ${
        isOpen ? "closed" : "open"
      }`, async () => {
        if (isOpen) {
          dropdownMenus.add(CHANNEL_SETTINGS_MENU_DROPDOWN)
        }
        const { inner, store } = await render()
        inner.find(".edit-button").prop("onClick")()
        assert.equal(
          store.getActions()[0].type,
          isOpen ? "HIDE_DROPDOWN" : "SHOW_DROPDOWN"
        )
      })
    })

    it("has two links in the menu", async () => {
      dropdownMenus.add(CHANNEL_SETTINGS_MENU_DROPDOWN)
      const { inner, store } = await render()
      assert.equal(inner.find("li").length, 2)
      assert.equal(
        inner
          .find("li")
          .at(0)
          .find("Link")
          .prop("to"),
        editChannelBasicURL(channel.name)
      )

      inner
        .find("li")
        .at(1)
        .find("a")
        .prop("onClick")()
      assert.equal(helper.currentLocation.pathname, channelURL(channel.name))
      assert.deepEqual(store.getActions(), [
        {
          type:    FORM_BEGIN_EDIT,
          payload: {
            formKey: WIDGET_FORM_KEY
          }
        }
      ])
    })
  })
})

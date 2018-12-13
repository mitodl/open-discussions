// @flow
import { assert } from "chai"

import ChannelSettingsLink, {
  CHANNEL_SETTINGS_MENU_DROPDOWN,
  ChannelSettingsLink as InnerChannelSettingsLink
} from "./ChannelSettingsLink"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannel } from "../factories/channels"

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
  ;[true, false].forEach(isOpen => {
    it(`renders a ${isOpen ? "visible" : "hidden"} menu`, async () => {
      if (isOpen) {
        dropdownMenus.add(CHANNEL_SETTINGS_MENU_DROPDOWN)
      }
      const { inner } = await render()
      assert.equal(inner.find("OnClickOutside(_DropdownMenu)").exists(), isOpen)
    })
  })
  ;[true, false].forEach(isOpen => {
    it(`toggles the menu state to ${isOpen ? "closed" : "open"}`, async () => {
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
})

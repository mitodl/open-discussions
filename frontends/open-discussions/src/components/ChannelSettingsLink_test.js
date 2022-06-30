/* global SETTINGS */
// @flow
import React from "react"
import { assert } from "chai"
import { Router } from "react-router"
import { mount } from "enzyme"

import ChannelSettingsLink, {
  CHANNEL_SETTINGS_MENU_DROPDOWN
} from "./ChannelSettingsLink"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannel } from "../factories/channels"
import { channelURL, editChannelBasicURL } from "../lib/url"
import { FORM_BEGIN_EDIT } from "../actions/forms"
import { WIDGET_FORM_KEY } from "../lib/widgets"

describe("ChannelSettingsLink", () => {
  let helper, render, dropdownMenus, channel, state, store

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    dropdownMenus = new Set()
    channel = makeChannel()
    state = { ui: { dropdownMenus } }
    store = helper.createMockStore(state)
    render = props =>
      mount(
        <Router history={helper.browserHistory}>
          <ChannelSettingsLink
            history={helper.browserHistory}
            store={store}
            channel={channel}
            {...props}
          />
        </Router>
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
        const wrapper = render()
        assert.equal(
          wrapper.find("OnClickOutside(_DropdownMenu)").exists(),
          isOpen
        )
      })
    })

    //
    ;[true, false].forEach(isOpen => {
      it(`toggles the menu state to ${
        isOpen ? "closed" : "open"
      }`, async () => {
        if (isOpen) {
          dropdownMenus.add(CHANNEL_SETTINGS_MENU_DROPDOWN)
        }
        const wrapper = render()
        wrapper.find(".edit-button").prop("onClick")()
        assert.equal(
          store.getActions()[0].type,
          isOpen ? "HIDE_DROPDOWN" : "SHOW_DROPDOWN"
        )
      })
    })

    it("has two links in the menu normally", async () => {
      dropdownMenus.add(CHANNEL_SETTINGS_MENU_DROPDOWN)
      const wrapper = render()
      assert.equal(wrapper.find("li").length, 2)
      assert.equal(
        wrapper.find("li").at(0).find("Link").prop("to"),
        editChannelBasicURL(channel.name)
      )

      wrapper.find("li").at(1).find("a").prop("onClick")()
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

    it("renders only one link on the post page", async () => {
      dropdownMenus.add(CHANNEL_SETTINGS_MENU_DROPDOWN)
      helper.browserHistory.push(`${channelURL(channel.name)}/postID/postSlug`)
      const wrapper = render()
      assert.equal(wrapper.find("li").length, 1)
      assert.equal(
        wrapper.find("li").at(0).find("Link").prop("to"),
        editChannelBasicURL(channel.name)
      )
    })
  })
})

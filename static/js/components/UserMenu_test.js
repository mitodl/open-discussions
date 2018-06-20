// @flow
/* global SETTINGS:false */
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"
import { Link } from "react-router-dom"

import UserMenu from "./UserMenu"
import { DropdownWithClickOutside, Dropdown } from "./UserMenu"

import { SETTINGS_URL } from "../lib/url"
import { defaultProfileImageUrl } from "../lib/util"
import * as utilFuncs from "../lib/util"

describe("UserMenu", () => {
  let toggleShowUserMenuStub, showUserMenu, profile, sandbox

  beforeEach(() => {
    toggleShowUserMenuStub = sinon.stub()
    sandbox = sinon.sandbox.create()
    showUserMenu = false
    profile = {
      name:              "Test User",
      username:          "AHJS123123FHG",
      image:             null,
      image_small:       null,
      image_medium:      null,
      image_file:        null,
      image_small_file:  null,
      image_medium_file: null,
      bio:               null,
      headline:          null
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderUserMenu = () =>
    shallow(
      <UserMenu
        toggleShowUserMenu={toggleShowUserMenuStub}
        showUserMenu={showUserMenu}
        profile={profile}
      />
    )

  const renderDropdown = () =>
    shallow(<Dropdown toggleShowUserMenu={toggleShowUserMenuStub} />)

  it("should include the profile image with onclick handler", () => {
    const wrapper = renderUserMenu()
    const { className, onClick, src } = wrapper.find("img").props()
    assert.equal(className, "profile-image")
    onClick()
    assert.isOk(toggleShowUserMenuStub.called)
    assert.equal(src, defaultProfileImageUrl)
  })

  it("should render the dropdown if showUserMenu", () => {
    [true, false].forEach(showUserMenuValue => {
      showUserMenu = showUserMenuValue
      const wrapper = renderUserMenu()
      if (showUserMenu) {
        assert.isOk(wrapper.find(DropdownWithClickOutside).exists())
      } else {
        assert.isNotOk(wrapper.find(DropdownWithClickOutside).exists())
      }
    })
  })
  ;[
    [true, true, false],
    [true, false, true],
    [false, true, false],
    [false, false, false]
  ].forEach(([featureFlagEnabled, complete, shouldShowDot]) => {
    it(`should ${
      shouldShowDot ? "" : "not "
    }include a red dot since the feature flag
     is ${featureFlagEnabled ? "enabled" : "disabled"} and the profile is
      ${complete ? "complete" : "incomplete"}`, () => {
      SETTINGS.profile_ui_enabled = featureFlagEnabled
      sandbox.stub(utilFuncs, "isProfileComplete").returns(complete)
      const wrapper = renderUserMenu()
      assert.equal(wrapper.find(".profile-incomplete").exists(), shouldShowDot)
    })
  })

  it("should not include a red dot if profile is complete", () => {
    SETTINGS.profile_ui_enabled = true
    sandbox.stub(utilFuncs, "isProfileComplete").returns(true)
    const wrapper = renderUserMenu()
    assert.isNotOk(wrapper.find(".profile-incomplete").exists())
  })

  it("dropdown menu should have a settings link", () => {
    const wrapper = renderDropdown()
    const { onClick, to, children } = wrapper.find(Link).props()
    onClick()
    assert.isOk(toggleShowUserMenuStub.called)
    assert.equal(to, SETTINGS_URL)
    assert.equal(children, "Settings")
  })

  it("should include a logout link, if feature is enabled", () => {
    SETTINGS.allow_email_auth = true
    const wrapper = renderDropdown()
    const { href, children } = wrapper.find("a").props()
    assert.equal(href, "/logout")
    assert.equal(children, "Sign Out")
  })
})

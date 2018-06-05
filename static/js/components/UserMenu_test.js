// @flow
/* global SETTINGS:false */
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"
import { Link } from "react-router-dom"

import UserMenu from "./UserMenu"
import DropdownMenu from "./DropdownMenu"

import { profileURL, SETTINGS_URL } from "../lib/url"
import * as utilFuncs from "../lib/util"
import ProfileImage from "../containers/ProfileImage"

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

  it("should include the profile image with onclick handler", () => {
    const wrapper = renderUserMenu()
    const { onClick } = wrapper.find(ProfileImage).props()
    onClick()
    assert.isOk(toggleShowUserMenuStub.called)
  })

  it("should render the dropdown if showUserMenu", () => {
    [true, false].forEach(showUserMenuValue => {
      showUserMenu = showUserMenuValue
      const wrapper = renderUserMenu()
      if (showUserMenu) {
        assert.isOk(wrapper.find(DropdownMenu).exists())
      } else {
        assert.isNotOk(wrapper.find(DropdownMenu).exists())
      }
    })
  })

  //
  ;[
    [true, true, false],
    [true, false, true],
    [false, true, false],
    [false, false, false]
  ].forEach(([featureFlagEnabled, complete, shouldShowDot]) => {
    it(`should ${
      shouldShowDot ? "" : "not "
    }include a red dot since the feature flag is ${
      featureFlagEnabled ? "enabled" : "disabled"
    } and the profile is
      ${complete ? "complete" : "incomplete"}`, () => {
      SETTINGS.profile_ui_enabled = featureFlagEnabled
      sandbox.stub(utilFuncs, "isProfileComplete").returns(complete)
      const wrapper = renderUserMenu()
      assert.equal(wrapper.find(".profile-incomplete").exists(), shouldShowDot)
    })
  })

  it("should not include a red dot if profile is complete", () => {
    SETTINGS.profile_ui_enabled = true
    SETTINGS.username = profile.username
    sandbox.stub(utilFuncs, "isProfileComplete").returns(true)
    const wrapper = renderUserMenu()
    assert.isNotOk(wrapper.find(".profile-incomplete").exists())
  })

  //
  ;[true, false].forEach(uiEnabled => {
    it(`dropdown menu should ${
      uiEnabled ? "" : "not"
    } include a profile link if profile UI ${
      uiEnabled ? "" : "not"
    } enabled`, async () => {
      SETTINGS.profile_ui_enabled = uiEnabled
      SETTINGS.username = profile.username
      showUserMenu = true
      const wrapper = renderUserMenu()
      assert.equal(
        wrapper
          .find(Link)
          .at(1)
          .props().to === profileURL(profile.username),
        uiEnabled
      )
    })
  })

  it("dropdown menu should have a settings link", () => {
    showUserMenu = true
    const wrapper = renderUserMenu()
    const { to, children } = wrapper.find(Link).props()
    assert.equal(to, SETTINGS_URL)
    assert.equal(children, "Settings")
  })

  it("should include a logout link, if feature is enabled", () => {
    SETTINGS.allow_email_auth = true
    showUserMenu = true
    const wrapper = renderUserMenu()
    const { href, children } = wrapper.find("a").props()
    assert.equal(href, "/logout")
    assert.equal(children, "Sign Out")
  })
})

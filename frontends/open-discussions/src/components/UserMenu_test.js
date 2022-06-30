// @flow
/* global SETTINGS:false */
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"
import { Link } from "react-router-dom"

import UserMenu, { LoggedInMenu, LoggedOutMenu } from "./UserMenu"
import { DropDownArrow, DropUpArrow } from "./Arrow"

import { profileURL, SETTINGS_URL, LOGIN_URL, REGISTER_URL } from "../lib/url"
import * as utilFuncs from "../lib/util"
import { defaultProfileImageUrl } from "../lib/util"
import { configureShallowRenderer, shouldIf } from "../lib/test_utils"

describe("UserMenu", () => {
  let toggleShowUserMenuStub, showUserMenu, profile, sandbox, renderUserMenu

  beforeEach(() => {
    toggleShowUserMenuStub = sinon.stub()
    sandbox = sinon.createSandbox()
    showUserMenu = false
    profile = {
      name:                 "Test User",
      username:             "AHJS123123FHG",
      image:                null,
      image_small:          null,
      image_medium:         null,
      image_file:           null,
      image_small_file:     null,
      image_medium_file:    null,
      profile_image_small:  defaultProfileImageUrl,
      profile_image_medium: defaultProfileImageUrl,
      bio:                  null,
      headline:             null
    }

    renderUserMenu = configureShallowRenderer(UserMenu, {
      toggleShowUserMenu: toggleShowUserMenuStub,
      showUserMenu,
      profile
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should include the profile image with onclick handler", () => {
    const wrapper = renderUserMenu()
    const { onClick } = wrapper.find(".user-menu-clickarea").props()
    onClick()
    assert.isOk(toggleShowUserMenuStub.called)
  })

  it("should show a drop-down or -up menu, depending on showUserMenu", () => {
    [true, false].forEach(showUserMenu => {
      const wrapper = renderUserMenu({ showUserMenu })
      assert.equal(showUserMenu, wrapper.find(DropUpArrow).exists())
      assert.equal(!showUserMenu, wrapper.find(DropDownArrow).exists())
    })
  })

  //
  ;[
    [true, true, false],
    [true, false, true],
    [false, true, false],
    [false, false, false]
  ].forEach(([featureFlagEnabled, complete, shouldShowDot]) => {
    it(`${shouldIf(
      shouldShowDot
    )} include a red dot since the feature flag is ${
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

  it("should render the dropdown if showUserMenu", () => {
    [true, false].forEach(showUserMenu => {
      const wrapper = renderUserMenu({ showUserMenu })
      assert.equal(showUserMenu, wrapper.find(LoggedInMenu).exists())
    })
  })

  it("should contain logged-in user links when profile is provided", () => {
    const wrapper = renderUserMenu({ showUserMenu: true, profile: profile })
    assert.isTrue(wrapper.find(LoggedInMenu).exists())
  })

  it("should contain logged-out user links when profile is null", () => {
    const wrapper = renderUserMenu({ showUserMenu: true, profile: null })
    assert.isTrue(wrapper.find(LoggedOutMenu).exists())
  })

  describe("menu items", () => {
    const menuProps = { closeMenu: () => {} }

    it("should include login and sign up links for logged-out users", () => {
      const wrapper = shallow(<LoggedOutMenu {...menuProps} />)
      const links = wrapper.find(Link)
      const firstLinkProps = links.at(0).props()
      assert.equal(firstLinkProps.to, LOGIN_URL)
      assert.equal(firstLinkProps.children, "Log In")
      const secondLinkProps = links.at(1).props()
      assert.equal(secondLinkProps.to, REGISTER_URL)
      assert.equal(secondLinkProps.children, "Sign Up")
    })

    it("should include settings link if non-null profile is provided", () => {
      const wrapper = shallow(<LoggedInMenu {...menuProps} />)
      const { to, children } = wrapper.find(Link).props()
      assert.equal(to, SETTINGS_URL)
      assert.equal(children, "Settings")
    })

    it("should include a logout link, if feature is enabled", () => {
      const wrapper = shallow(<LoggedInMenu {...menuProps} />)
      const { href, children } = wrapper.find("a").props()
      assert.equal(href, "/logout")
      assert.equal(children, "Sign Out")
    })

    //
    ;[true, false].forEach(uiEnabled => {
      it(`dropdown menu ${shouldIf(
        uiEnabled
      )} include a profile link if profile UI ${
        uiEnabled ? "" : "not"
      } enabled`, async () => {
        SETTINGS.profile_ui_enabled = uiEnabled
        SETTINGS.username = profile.username
        const wrapper = shallow(<LoggedInMenu {...menuProps} />)
        assert.equal(wrapper.find("Link").at(1).exists(), uiEnabled)
        if (uiEnabled) {
          assert.equal(
            wrapper.find("Link").at(1).props().to,
            profileURL(profile.username)
          )
        }
      })
    })
  })
})

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

describe("UserMenu", () => {
  let toggleShowUserMenuStub, showUserMenu

  beforeEach(() => {
    toggleShowUserMenuStub = sinon.stub()
    showUserMenu = false
  })

  const renderUserMenu = () =>
    shallow(
      <UserMenu
        toggleShowUserMenu={toggleShowUserMenuStub}
        showUserMenu={showUserMenu}
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
    assert.equal(src, SETTINGS.profile_image_small)
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

  it("should include a red dot if profile is incomplete", () => {
    SETTINGS.profile_complete = false
    const wrapper = renderUserMenu()
    assert.isOk(wrapper.find(".profile-incomplete").exists())
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

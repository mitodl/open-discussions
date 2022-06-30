import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import { SettingsTabs } from "./SettingsTabs"

const generateLocation = (pathname: ?string) => ({
  pathname: pathname || "",
  search:   "",
  hash:     ""
})

describe("SettingsTabs", function() {
  it("should render settings links", () => {
    const mockLocation = generateLocation()
    const wrapper = shallow(<SettingsTabs location={mockLocation} />)
    const navLinks = wrapper.find("NavLink")
    assert.equal(navLinks.length, 2)
    const notificationsLink = navLinks.at(0)
    const accountLink = navLinks.at(1)
    assert.equal(notificationsLink.prop("children"), "Email Notifications")
    assert.equal(accountLink.prop("children"), "Account")
  })

  it("should set a default active tab with an unhandled url", () => {
    const mockLocation = generateLocation("/unhandled/url")
    const wrapper = shallow(<SettingsTabs location={mockLocation} />)
    assert.include(wrapper.find("NavLink").at(0).prop("className"), "active")
  })
})

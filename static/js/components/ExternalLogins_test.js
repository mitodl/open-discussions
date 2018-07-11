// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import { TOUCHSTONE_URL } from "../lib/url"
import ExternalLogins from "./ExternalLogins"

describe("ExternalLogins component", () => {
  const mountExternalLogins = (props = {}) =>
    shallow(<ExternalLogins {...props} />)

  it("should have a link to Touchstone", () => {
    const wrapper = mountExternalLogins()
    const link = wrapper.find(".link-button")
    assert.ok(link.exists())
    assert.equal(link.props().href, TOUCHSTONE_URL)
  })

  it("should put className, if passed one", () => {
    const wrapper = mountExternalLogins({ className: "custom-class" })
    assert.equal(wrapper.props().className, "actions row custom-class")
  })
})

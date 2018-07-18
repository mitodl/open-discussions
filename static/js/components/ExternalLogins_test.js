// @flow
/* global SETTINGS:false */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import { TOUCHSTONE_URL } from "../lib/url"
import ExternalLogins from "./ExternalLogins"

describe("ExternalLogins component", () => {
  const mountExternalLogins = (props = {}) =>
    shallow(<ExternalLogins {...props} />)

  it("should put className, if passed one", () => {
    SETTINGS.allow_saml_auth = true
    const wrapper = mountExternalLogins({ className: "custom-class" })
    assert.equal(wrapper.props().className, "actions row custom-class")
  })
  //
  ;[true, false].forEach(allowSaml => {
    it(`should ${allowSaml ? "" : "not "}have a link to Touchstone`, () => {
      SETTINGS.allow_saml_auth = allowSaml
      const wrapper = mountExternalLogins()
      const link = wrapper.find(".link-button")
      assert.equal(link.exists(), allowSaml)
    })
  })

  it("should have the correct URL for Touchstone", () => {
    SETTINGS.allow_saml_auth = true
    const wrapper = mountExternalLogins()
    const link = wrapper.find(".link-button")
    assert.equal(link.props().href, TOUCHSTONE_URL)
  })
})

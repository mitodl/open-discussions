// @flow
/* global SETTINGS:false */
import { assert } from "chai"

import ExternalLogins from "./ExternalLogins"

import { configureShallowRenderer } from "../lib/test_utils"

describe("ExternalLogins component", () => {
  let renderExternalLogins

  beforeEach(() => {
    renderExternalLogins = configureShallowRenderer(ExternalLogins, {})
  })

  it("should put className, if passed one", () => {
    SETTINGS.allow_saml_auth = true
    const wrapper = renderExternalLogins({ className: "custom-class" })
    assert.equal(wrapper.props().className, "actions row custom-class")
  })

  //
  ;[true, false].forEach(allowSaml => {
    it(`should ${allowSaml ? "" : "not "}have a link to Touchstone`, () => {
      SETTINGS.allow_saml_auth = allowSaml
      const wrapper = renderExternalLogins()
      const button = wrapper.find("TouchstoneLoginButton")
      assert.equal(button.exists(), allowSaml)
    })
  })
})

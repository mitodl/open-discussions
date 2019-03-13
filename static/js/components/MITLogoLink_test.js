// @flow
/* global SETTINGS: false */
import { assert } from "chai"

import MITLogoLink from "./MITLogoLink"

import { configureShallowRenderer } from "../lib/test_utils"

describe("MITLogoLink", () => {
  let renderComponent

  beforeEach(() => {
    renderComponent = configureShallowRenderer(MITLogoLink)
  })
  ;[
    ["/static/images/MIT_circle.svg", true],
    ["/static/images/mit-logo-transparent3.svg", false]
  ].forEach(([logoName, enabled]) => {
    it(`should render the ${logoName} logo depending if use_new_branding = ${String(
      enabled
    )}`, () => {
      SETTINGS.use_new_branding = enabled
      const wrapper = renderComponent()
      assert.equal(wrapper.find(".mitlogo img").props().src, logoName)
    })
  })
})

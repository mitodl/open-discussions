// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"

import HamburgerAndLogo from "./HamburgerAndLogo"

import { configureShallowRenderer } from "../lib/test_utils"

describe("HamburgerAndLogo", () => {
  let renderComponent

  beforeEach(() => {
    renderComponent = configureShallowRenderer(HamburgerAndLogo, {})
  })

  it("should set a click handler", () => {
    const onHamburgerClick = sinon.stub()
    const wrapper = renderComponent({ onHamburgerClick })
    wrapper.find(".material-icons").simulate("click")
    sinon.assert.called(onHamburgerClick)
  })

  //
  ;[
    ["/static/images/MIT_circle.svg", true],
    ["/static/images/mit-logo-transparent3.svg", false]
  ].forEach(([logoName, enabled]) => {
    it("should render the ${logoName} logo depending if use_new_branding = ${enabled}", () => {
      SETTINGS.use_new_branding = enabled
      const wrapper = renderComponent()
      assert.equal(wrapper.find(".mitlogo img").props().src, logoName)
    })
  })
})

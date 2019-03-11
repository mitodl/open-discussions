// @flow
/* global SETTINGS: false */
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
})

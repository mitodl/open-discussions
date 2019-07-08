// @flow
/* global SETTINGS: false */
import { assert } from "chai"

import MITLogoLink from "./MITLogoLink"

import { MIT_LOGO_URL } from "../lib/url"
import { configureShallowRenderer } from "../lib/test_utils"

describe("MITLogoLink", () => {
  let renderComponent

  beforeEach(() => {
    renderComponent = configureShallowRenderer(MITLogoLink)
  })

  it("should render the logo", () => {
    const wrapper = renderComponent()
    assert.equal(wrapper.find(".mitlogo img").props().src, MIT_LOGO_URL)
  })
})

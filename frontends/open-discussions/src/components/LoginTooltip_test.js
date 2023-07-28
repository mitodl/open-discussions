// @flow
import { assert } from "chai"
import sinon from "sinon"
import { Link } from "react-router-dom"

import { LoginTooltipContent } from "./LoginTooltip"

import { configureShallowRenderer } from "../lib/test_utils"

describe("LoginTooltip", () => {
  let toggleTooltipStub, sandbox, renderLoginTooltipHelper

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    toggleTooltipStub = sandbox.stub()

    renderLoginTooltipHelper = configureShallowRenderer(LoginTooltipContent, {
      toggleTooltip: toggleTooltipStub
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should include login and signup buttons", () => {
    const pathname = "/next/url"
    const wrapper = renderLoginTooltipHelper()
    const links = wrapper.find(Link)
    assert.equal(links.length, 1)
    assert.equal(
      links.at(0).prop("to")({ pathname }),
      `/login/?next=${encodeURIComponent(pathname)}`
    )
  })
})

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
    const wrapper = renderLoginTooltipHelper()
    const links = wrapper.find(Link)
    assert.equal(links.at(0).prop("to"), "/login")
    assert.equal(links.at(1).prop("to"), "/signup")
  })
})

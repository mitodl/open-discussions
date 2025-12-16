// @flow
import { assert } from "chai"
import sinon from "sinon"

import Navigation from "./Navigation"

import * as channels from "../lib/channels"
import * as util from "../lib/util"
import { configureShallowRenderer, shouldIf } from "../lib/test_utils"
import { makeChannelList } from "../factories/channels"

describe("Navigation", () => {
  let sandbox,
    userIsAnonymousStub,
    defaultProps: Object,
    userCanPostStub,
    renderComponent

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    userIsAnonymousStub = sandbox.stub(util, "userIsAnonymous")
    userIsAnonymousStub.returns(false)
    userCanPostStub = sandbox.stub(channels, "userCanPost")
    userCanPostStub.returns(true)
    const subscribedChannels = makeChannelList(10)
    defaultProps = {
      pathname:           "/",
      subscribedChannels: subscribedChannels
    }
    renderComponent = configureShallowRenderer(Navigation, defaultProps)
  })

  afterEach(() => {
    sandbox.restore()
  })

  //
  ;[
    [null, true],
    ["/not/home", false]
  ].forEach(([pathnameProp, expHighlighted]) => {
    it(`${shouldIf(expHighlighted)} highlight the home link if path=${String(
      pathnameProp
    )}`, () => {
      const wrapper = renderComponent(
        pathnameProp ? { pathname: pathnameProp } : {}
      )
      assert.equal(
        wrapper.find(".location.current-location").find(".home-link").exists(),
        expHighlighted
      )
    })
  })
})

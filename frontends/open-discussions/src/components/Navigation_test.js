// @flow
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { Router } from "react-router"
import { mount } from "enzyme"
import { Provider } from "react-redux"

import Navigation from "./Navigation"
import LoginTooltip from "./LoginTooltip"

import * as channels from "../lib/channels"
import * as util from "../lib/util"
import { configureShallowRenderer, shouldIf } from "../lib/test_utils"
import { makeChannelList } from "../factories/channels"
import IntegrationTestHelper from "../util/integration_test_helper"

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

  describe("compose link", () => {
    const postLinkSel = ".new-post-link"

    let helper

    beforeEach(() => {
      helper = new IntegrationTestHelper()
    })

    afterEach(() => {
      helper.cleanup()
    })

    it("should not be shown if the showComposeLink=false", () => {
      const wrapper = renderComponent({
        showComposeLink: false
      })
      assert.isFalse(wrapper.find(postLinkSel).exists())
    })

    it("should be wrapped with <LoginTooltip />", () => {
      userIsAnonymousStub.returns(true)
      const wrapper = mount(
        <Provider store={helper.store}>
          <Router history={helper.browserHistory}>
            <Navigation showComposeLink={true} {...defaultProps} />
          </Router>
        </Provider>
      )
      const tooltip = wrapper.find(LoginTooltip)
      assert.ok(tooltip.exists())
      const newPostLink = tooltip.find(postLinkSel).at(0)
      assert.equal(newPostLink.prop("to"), "#")
    })

    it("should link to a page indicated by the composeHref prop", () => {
      const composeHref = "/path/to/compose"
      const wrapper = renderComponent({
        showComposeLink: true,
        composeHref:     composeHref
      })
      const newPostLink = wrapper.find(postLinkSel)
      assert.equal(newPostLink.prop("to"), composeHref)
    })
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

import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"

import Navigation from "../components/Navigation"
import { ResponsiveDrawer, mapStateToProps } from "./Drawer"

import { setShowDrawerMobile } from "../actions/ui"
import { DRAWER_BREAKPOINT } from "../lib/util"
import * as selectors from "../lib/redux_selectors"
import * as utilFuncs from "../lib/util"

describe("Drawer tests", () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe("drawer component", () => {
    let dispatchStub, channels, isMobileWidthStub, getViewportWidthStub

    beforeEach(() => {
      dispatchStub = sandbox.stub()
      isMobileWidthStub = sandbox.stub(utilFuncs, "isMobileWidth").returns(true)
      getViewportWidthStub = sandbox.stub(utilFuncs, "getViewportWidth")
      channels = ["channels"]
    })

    const renderDrawer = (props = {}) =>
      shallow(
        <ResponsiveDrawer
          subscribedChannels={channels}
          location={{ pathname: "a path" }}
          dispatch={dispatchStub}
          {...props}
        />
      )

    it("should set a CSS class when not mobile and open", () => {
      isMobileWidthStub.returns(false)
      ;[true, false].forEach(showDrawerDesktop => {
        const wrapper = renderDrawer({ showDrawerDesktop })

        assert.equal(
          wrapper.props().className,
          showDrawerDesktop ? "persistent-drawer-open" : ""
        )
      })
    })

    it("should include a menu button when mobile", () => {
      const wrapper = renderDrawer()
      const mobileHeader = wrapper.find(".drawer-mobile-header")

      const { href, onClick } = mobileHeader.find("a.material-icons").props()
      assert.equal(href, "#")
      assert.equal(onClick, wrapper.instance().onDrawerClose)

      const logo = mobileHeader.find(".mitlogo")
      assert.equal(logo.props().href, "http://www.mit.edu")
      assert.equal(
        logo.find("img").props().src,
        "/static/images/mit-logo-transparent3.svg"
      )
    })

    it("should pass props to Navigation", () => {
      const { subscribedChannels, pathname } = renderDrawer()
        .find(Navigation)
        .props()
      assert.deepEqual(subscribedChannels, channels)
      assert.deepEqual(pathname, "a path")
    })

    it("should have an onDrawerClose function to hide the mobile drawer", () => {
      renderDrawer({ showDrawerMobile: true })
        .instance()
        .onDrawerClose()
      assert.ok(dispatchStub.calledWith(setShowDrawerMobile(false)))
    })

    it("should close the mobile drawer when resizing above the breakpoint", () => {
      getViewportWidthStub.returns(DRAWER_BREAKPOINT - 100)
      const wrapper = renderDrawer({ showDrawerMobile: true })
      getViewportWidthStub.returns(DRAWER_BREAKPOINT + 100)
      wrapper.instance().onResize()
      assert.ok(dispatchStub.calledWith(setShowDrawerMobile(false)))
    })

    it("should put an event listener on window resize", () => {
      const onResizeStub = sandbox.stub(ResponsiveDrawer.prototype, "onResize")
      const addEventListenerStub = sandbox.stub(window, "addEventListener")
      renderDrawer()
      assert.ok(addEventListenerStub.calledWith("resize"))
      // this is to check that the onResize function was passed to addEventListener
      // we'll call it and make sure that the stub was called.
      addEventListenerStub.args[0][1]()
      assert.ok(onResizeStub.called)
    })
  })

  describe("mapStateToProps", () => {
    let state, getSubscribedChannelsStub

    beforeEach(() => {
      state = {
        channels: ["one", "two"],
        ui:       { showDrawerMobile: true, showDrawerDesktop: true }
      }
      getSubscribedChannelsStub = sandbox.stub(
        selectors,
        "getSubscribedChannels"
      )
    })

    it("should grab state.ui.showDrawer props", () => {
      const { showDrawerMobile, showDrawerDesktop } = mapStateToProps(state)
      assert.equal(showDrawerMobile, state.ui.showDrawerMobile)
      assert.equal(showDrawerDesktop, state.ui.showDrawerDesktop)
    })

    it("should call getSubscribedChannels", () => {
      mapStateToProps(state)
      assert.ok(getSubscribedChannelsStub.calledWith(state))
    })
  })
})

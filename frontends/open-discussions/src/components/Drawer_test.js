// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"
import { Drawer } from "@rmwc/drawer"

import { ResponsiveDrawer, mapStateToProps } from "./Drawer"

import { NavigationExpansion } from "../components/NavigationItem"

import { setShowDrawerMobile } from "../actions/ui"
import { DRAWER_BREAKPOINT } from "../lib/util"
import * as selectors from "../lib/redux_selectors"
import * as util from "../lib/util"
import { makeChannelList } from "../factories/channels"
import { INITIAL_AUDIO_STATE } from "../reducers/audio"

describe("Drawer", () => {
  let sandbox, dispatchStub, channels, isMobileWidthStub, getViewportWidthStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    dispatchStub = sandbox.stub()
    isMobileWidthStub = sandbox.stub(util, "isMobileWidth").returns(true)
    getViewportWidthStub = sandbox.stub(util, "getViewportWidth")
    channels = makeChannelList()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderDrawer = (props = {}) =>
    shallow(
      <ResponsiveDrawer
        subscribedChannels={channels}
        location={{ pathname: "a path", search: "", hash: "" }}
        dispatch={dispatchStub}
        channels={new Map(channels.map(channel => [channel.name, channel]))}
        showDrawerDesktop={false}
        showDrawerMobile={false}
        showDrawerHover={false}
        audioPlayerLoaded={false}
        {...props}
      />
    )

  it("should set a CSS class when not mobile and open", () => {
    isMobileWidthStub.returns(false)
    ;[true, false].forEach(showDrawerDesktop => {
      const wrapper = renderDrawer({ showDrawerDesktop })

      assert.equal(
        wrapper.props().className,
        showDrawerDesktop
          ? "persistent-drawer open"
          : "persistent-drawer closed"
      )
    })
  })

  it("should include a menu button when mobile", () => {
    const wrapper = renderDrawer()
    const component = wrapper
      .find(".drawer-mobile-header")
      .find("HamburgerAndLogo")
    assert.ok(component.exists())
    assert.equal(
      component.props().onHamburgerClick,
      wrapper.instance().onDrawerClose
    )
  })

  it("should have an onDrawerClose function to hide the mobile drawer", () => {
    renderDrawer({ showDrawerMobile: true }).instance().onDrawerClose()
    assert.ok(dispatchStub.calledWith(setShowDrawerMobile(false)))
  })

  it("should set onPointerEnter and onPointerLeave handlers on the Drawer", () => {
    const wrapper = renderDrawer()
    const { onPointerEnter, onPointerLeave } = wrapper.find(Drawer).props()
    assert.equal(onPointerEnter, wrapper.instance().onMouseEnter)
    assert.equal(onPointerLeave, wrapper.instance().onMouseExit)
  })

  //
  ;[
    [true, true, true, true],
    [true, false, true, true],
    [true, true, false, true],
    [true, false, false, true],
    [false, true, true, true],
    [false, false, true, true],
    [false, true, false, true],
    [false, false, false, false]
  ].forEach(([isMobile, showDrawerDesktop, showDrawerHover, expandedExp]) => {
    it(`should have expanded==${String(expandedExp)} when isMobile==${String(
      isMobile
    )}, showDrawerDesktop=${String(
      showDrawerDesktop
    )}, showDrawerHover=${String(showDrawerHover)}`, () => {
      isMobileWidthStub.returns(isMobile)
      const wrapper = renderDrawer({
        showDrawerDesktop,
        showDrawerHover
      })
      assert.equal(
        wrapper.find(NavigationExpansion.Provider).prop("value"),
        expandedExp
      )
    })
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

  describe("mapStateToProps", () => {
    let state, isAudioPlayerLoadedStub

    beforeEach(() => {
      state = {
        channels: ["one", "two"],
        ui:       {
          showDrawerMobile:  true,
          showDrawerDesktop: true,
          showDrawerHover:   true
        },
        audio: {
          currentlyPlaying: INITIAL_AUDIO_STATE
        }
      }
      isAudioPlayerLoadedStub = sandbox.stub(
        selectors,
        "isAudioPlayerLoadedSelector"
      )
    })

    it("should grab state.ui.showDrawer props", () => {
      const { showDrawerMobile, showDrawerDesktop, showDrawerHover } =
        mapStateToProps(state)
      assert.equal(showDrawerMobile, state.ui.showDrawerMobile)
      assert.equal(showDrawerDesktop, state.ui.showDrawerDesktop)
      assert.equal(showDrawerHover, state.ui.showDrawerHover)
    })

    it("should call isAudioPlayerLoadedSelector", () => {
      mapStateToProps(state)
      assert.ok(isAudioPlayerLoadedStub.calledWith(state))
    })
  })
})

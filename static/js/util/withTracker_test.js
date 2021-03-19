/* global SETTINGS: false */
// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"
import ReactGA from "react-ga"

import withTracker from "./withTracker"
import { TestPage } from "../lib/test_utils"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("withTracker", () => {
  let sandbox, gaInitStub, gaPageViewStub, WrappedPage

  const renderPage = ({ ...props }) => shallow(<WrappedPage {...props} />)

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    gaInitStub = sandbox.stub(ReactGA, "initialize")
    gaPageViewStub = sandbox.stub(ReactGA, "pageview")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should make an initialization and pageview call when SETTINGS.gaTrackingID is set ", () => {
    SETTINGS.gaTrackingID = "UA-default-1"
    window.location = `http://fake/c/path`
    WrappedPage = withTracker(TestPage)
    renderPage({ location: window.location })
    assert.ok(gaInitStub.calledOnce)
    assert.ok(gaPageViewStub.calledWith("/c/path"))
  })

  it("should append gtag.js scripts to the header when SETTINGS.gaGTrackingID is set ", () => {
    SETTINGS.gaGTrackingID = "G-default-1"
    // $FlowFixMe: it's a test
    document.head.innerHTML = ""
    WrappedPage = withTracker(TestPage)
    renderPage({ location: window.location })
    // $FlowFixMe: it's a test
    assert(document.head.childElementCount === 2)
    assert(
      // $FlowFixMe: it's a test
      document.head.firstChild.src ===
        "https://www.googletagmanager.com/gtag/js?id=G-default-1"
    )
  })

  it("should make pageview call when SETTINGS.gaGTrackingID is set ", () => {
    SETTINGS.gaGTrackingID = "G-default-1"
    window.location = `http://fake/c/path`
    const helper = new IntegrationTestHelper()
    window.gtag = helper.sandbox.stub()
    const gTagStub = window.gtag

    WrappedPage = withTracker(TestPage)
    renderPage({ location: window.location })
    assert.ok(gTagStub.calledOnce)
    assert.ok(
      gTagStub.calledWith("event", "page_view", {
        page_path: window.location.pathname
      })
    )
  })
})

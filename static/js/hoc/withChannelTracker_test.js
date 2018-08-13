import React from "react"
import ReactGA from "react-ga"
import sinon from "sinon"
import { assert } from "chai"
import { shallow } from "enzyme"

import { makeChannel } from "../factories/channels"
import { withChannelTracker } from "./withChannelTracker"
import { TestPage } from "../lib/test_utils"

describe("withTracker", () => {
  let sandbox, gaGaStub, channel, WrappedPage

  const renderPage = ({ ...props }) => shallow(<WrappedPage {...props} />)

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    gaGaStub = sandbox.stub(ReactGA, "ga")
    channel = makeChannel()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should call GA create and pageview if channel has a tracking id", () => {
    channel.ga_tracking_id = "UA-FAKE-01"
    window.location = "http://fake/c/path"
    WrappedPage = withChannelTracker(TestPage)
    renderPage({ location: window.location, channel: channel })
    assert.ok(
      gaGaStub.calledWith("create", channel.ga_tracking_id, "auto", {
        name: "UA_FAKE_01"
      })
    )
    assert.ok(
      gaGaStub.calledWith(
        "UA_FAKE_01.send",
        "pageview",
        window.location.pathname
      )
    )
  })

  it("should not call GA create and pageview if channel does not have a tracking id", () => {
    channel.ga_tracking_id = null
    window.location = "http://fake/c/path"
    WrappedPage = withChannelTracker(TestPage)
    renderPage({ location: window.location, channel: channel })
    assert.ok(gaGaStub.notCalled)
  })
})

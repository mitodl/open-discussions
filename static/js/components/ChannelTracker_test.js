import React from "react"
import ReactGA from "react-ga"
import sinon from "sinon"
import { assert } from "chai"
import { shallow } from "enzyme"

import { ChannelTracker } from "./ChannelTracker"

import { makeChannel } from "../factories/channels"

describe("ChannelTracker", () => {
  let gaGaStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    gaGaStub = sandbox.stub(ReactGA, "ga")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should call GA create and pageview if channel has a tracking id", () => {
    const channel = makeChannel()
    channel.ga_tracking_id = "UA-FAKE-01"
    window.location = "http://fake/c/path"
    shallow(<ChannelTracker channel={channel} location={window.location} />)
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
    const channel = makeChannel()
    channel.ga_tracking_id = null
    window.location = "http://fake/c/path"
    shallow(<ChannelTracker channel={channel} location={window.location} />)
    assert.ok(gaGaStub.notCalled)
  })
})

import React from "react"
import ReactGA from "react-ga"
import { assert } from "chai"

import { makeChannel } from "../factories/channels"
import { withChannelTracker } from "./withChannelTracker"
import { shouldIf, TestPage } from "../lib/test_utils"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("withTracker", () => {
  let helper, render, gaGaStub, channel, WrappedPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    gaGaStub = helper.sandbox.stub(ReactGA, "ga")
    channel = makeChannel()
    WrappedPage = withChannelTracker(TestPage)
    render = helper.configureHOCRenderer(
      WrappedPage,
      TestPage,
      {},
      {
        channel:  channel,
        location: { search: {} }
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should call GA create and pageview if channel has a tracking id", async () => {
    channel.ga_tracking_id = "UA-FAKE-01"
    window.location = "http://fake/c/path"

    await render({}, { location: window.location, channel: channel })
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

  it("should not call GA create and pageview if channel does not have a tracking id", async () => {
    channel.ga_tracking_id = null
    window.location = "http://fake/c/path"
    await render({}, { location: window.location, channel: channel })
    assert.ok(gaGaStub.notCalled)
  })

  //
  ;[true, false].forEach(updateChannel => {
    it(`${shouldIf(
      updateChannel
    )} call loadGA() on componentDidUpdate`, async () => {
      channel.ga_tracking_id = "UA-FAKE-01"
      window.location = "http://fake/c/path"
      const { wrapper } = await render(
        {},
        { location: window.location, channel: channel }
      )
      const prevProps = {
        location: window.location,
        channel:  updateChannel ? null : channel
      }
      wrapper.instance().componentDidUpdate(prevProps)
      assert.equal(gaGaStub.callCount, updateChannel ? 4 : 2)
    })
  })
})

import { assert } from "chai"
import { mount } from "enzyme"
import React from "react"

import { makeChannel } from "../factories/channels"
import { withChannelTracker } from "./withChannelTracker"
import { TestPage } from "../lib/test_utils"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("withTracker", () => {
  let helper, gTagStub, channel

  const WrappedPage = withChannelTracker(TestPage)

  const render = (state = {}, props = {}) => {
    const wrapper = mount(<WrappedPage {...props} />)
    wrapper.setState(state)
    return wrapper
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    window.gtag = helper.sandbox.stub()
    window.location = "http://fake/c/path"
    window.google_tag_manager = []
    gTagStub = window.gtag
    channel = makeChannel()
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should call gtag config and event if channel has a tracking id", async () => {
    channel.ga_tracking_id = "UA-FAKE-01"

    await render({}, { location: window.location, channel: channel })
    assert.ok(gTagStub.calledWith("config", channel.ga_tracking_id))
    assert.isNotTrue(window["ga-disable-UA-FAKE-01"])
  })

  it("should not call GA config and event if channel does not have a tracking id", async () => {
    channel.ga_tracking_id = null
    await render({}, { location: window.location, channel: channel })
    assert.ok(gTagStub.notCalled)
  })

  it("should not call GA config and event if window.gtag is not set", async () => {
    window.gtag = null
    await render({}, { location: window.location, channel: channel })
    assert.ok(gTagStub.notCalled)
  })

  it("should not call GA config if channel is already loaded and tracker is not disabled", async () => {
    channel.ga_tracking_id = "UA-FAKE-01"
    window.google_tag_manager = { "UA-FAKE-01": true }

    await render({}, { location: window.location, channel: channel })
    assert.ok(gTagStub.notCalled)
  })

  it("should call GA config if channel is already loaded and tracker is disabled", async () => {
    channel.ga_tracking_id = "UA-FAKE-01"
    window.google_tag_manager = ["UA-FAKE-01"]
    window[`ga-disable-${channel.ga_tracking_id}`] = true

    await render({}, { location: window.location, channel: channel })
    assert.ok(gTagStub.calledWith("config", channel.ga_tracking_id))
  })

  it("should call GA config if google_tag_manager is not set", async () => {
    channel.ga_tracking_id = "UA-FAKE-01"
    window.google_tag_manager = null
    window[`ga-disable-${channel.ga_tracking_id}`] = true

    await render({}, { location: window.location, channel: channel })
    assert.ok(gTagStub.calledWith("config", channel.ga_tracking_id))
  })

  it("should disable the previous tracker if the channel changes", async () => {
    channel.ga_tracking_id = "UA-FAKE-01"

    const prevChannel = makeChannel()
    prevChannel.ga_tracking_id = "UA-OLD-FAKE-01"

    const wrapper = await render(
      {},
      { location: window.location, channel: channel }
    )
    const prevProps = {
      location: window.location,
      channel:  prevChannel
    }
    wrapper.instance().componentDidUpdate(prevProps)

    assert.isTrue(window["ga-disable-UA-OLD-FAKE-01"])
    assert.ok(gTagStub.calledWith("config", channel.ga_tracking_id))
  })

  it("should disable the tracker before unmount", async () => {
    channel.ga_tracking_id = "UA-FAKE-01"

    const wrapper = await render(
      {},
      { location: window.location, channel: channel }
    )

    wrapper.instance().componentWillUnmount()

    assert.isTrue(window["ga-disable-UA-FAKE-01"])
  })
})

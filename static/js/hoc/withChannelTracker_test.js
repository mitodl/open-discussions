import { assert } from "chai"
import { mount } from "enzyme"
import React from "react"

import { makeChannel } from "../factories/channels"
import { withChannelTracker } from "./withChannelTracker"
import { shouldIf, TestPage } from "../lib/test_utils"
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
    gTagStub = window.gtag
    channel = makeChannel()
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should call gtag config and event if channel has a tracking id", async () => {
    channel.ga_tracking_id = "UA-FAKE-01"
    window.location = "http://fake/c/path"

    await render({}, { location: window.location, channel: channel })
    assert.ok(
      gTagStub.calledWith("config", channel.ga_tracking_id, {
        send_page_view: false
      })
    )
    assert.ok(
      gTagStub.calledWith("event", "page_view", {
        page_path: window.location.pathname,
        send_to:   channel.ga_tracking_id
      })
    )
  })

  it("should not call GA config and event if channel does not have a tracking id", async () => {
    channel.ga_tracking_id = null
    window.location = "http://fake/c/path"
    await render({}, { location: window.location, channel: channel })
    assert.ok(gTagStub.notCalled)
  })

  it("should not call GA config and event if window.gtag is not set", async () => {
    window.gtag = null
    window.location = "http://fake/c/path"
    await render({}, { location: window.location, channel: channel })
    assert.ok(gTagStub.notCalled)
  })

  //
  ;[[true, 4], [false, 2]].forEach(([missingPrevChannel, gaCalls]) => {
    it(`${shouldIf(
      missingPrevChannel
    )} call google analytics on componentDidUpdate`, async () => {
      channel.ga_tracking_id = "UA-FAKE-01"
      const prevChannel = missingPrevChannel ? null : channel
      window.location = "http://fake/c/path"
      const wrapper = await render(
        {},
        { location: window.location, channel: channel }
      )
      const prevProps = {
        location: window.location,
        channel:  prevChannel
      }
      wrapper.instance().componentDidUpdate(prevProps)
      assert.equal(gTagStub.callCount, gaCalls)
    })
  })
})

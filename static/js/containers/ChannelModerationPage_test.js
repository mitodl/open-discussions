// @flow
import R from "ramda"
import { assert } from "chai"

import ChannelModerationPage, {
  ChannelModerationPage as InnerChannelModerationPage
} from "./ChannelModerationPage"

import IntegrationTestHelper from "../util/integration_test_helper"
import { channelURL } from "../lib/url"
import { makeChannel } from "../factories/channels"
import { makeReportRecord } from "../factories/reports"

describe("ChannelModerationPage", () => {
  let helper, channel, renderPage
  beforeEach(() => {
    helper = new IntegrationTestHelper()
    channel = makeChannel()
    renderPage = helper.configureHOCRenderer(
      ChannelModerationPage,
      InnerChannelModerationPage,
      {
        channels: {
          data:       new Map([[channel.name, channel]]),
          loaded:     true,
          processing: false
        },
        reports: {
          data: {
            reports: R.range(0, 5).map(makeReportRecord)
          },
          loaded:     true,
          processing: false
        },
        forms: {},
        posts: {
          data:       [],
          loaded:     true,
          processing: false
        },
        focus:              {},
        subscribedChannels: {
          loaded:  true,
          process: false,
          data:    [channel.name]
        },
        ui: {
          dialogs: new Map()
        }
      },
      {
        match: {
          params: {
            channelName: channel.name
          }
        }
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("redirects for non-moderator users", async () => {
    channel.user_is_moderator = false
    const { inner } = await renderPage()
    const redirect = inner.find("Redirect")
    assert.equal(redirect.length, 1)
    assert.equal(redirect.props().to, channelURL(channel.name))
  })

  it("loads correctly if the channel is not yet available", async () => {
    const { inner } = await renderPage({
      channels: {
        data:       new Map(),
        loaded:     false,
        processing: true
      }
    })
    assert.equal(inner.find("Loading").length, 1)
  })
})

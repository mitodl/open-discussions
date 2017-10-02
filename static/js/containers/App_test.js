// @flow
import React from "react"
import sinon from "sinon"
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannelList } from "../factories/channels"
import { actions } from "../actions"

describe("App", () => {
  let helper, renderComponent, channels

  beforeEach(() => {
    channels = makeChannelList(10)
    helper = new IntegrationTestHelper()
    helper.getChannelsStub.returns(Promise.resolve(channels))
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("loads requirements", async () => {
    await renderComponent("/missing", [
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType
    ])
    sinon.assert.calledWith(helper.getChannelsStub)
  })

  it("doesn't load requirements for auth_required", () => {
    helper.browserHistory.push("/auth_required/")
    assert.isRejected(
      renderComponent("/missing", [
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType
      ])
    )
  })
})

// @flow
import React from "react"
import { mount } from "enzyme"
import sinon from "sinon"

import Router, { routes } from "../Router"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannelList } from "../factories/channels"
import { actions } from "../actions"
import { wait } from "../lib/util"

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

  it("doesn't load requirements for auth_required", async () => {
    helper.browserHistory.push("/auth_required/")
    mount(
      <div>
        <Router history={helper.browserHistory} store={helper.store}>
          {routes}
        </Router>
      </div>
    )
    await wait(200)

    sinon.assert.notCalled(helper.getChannelsStub)
  })
})

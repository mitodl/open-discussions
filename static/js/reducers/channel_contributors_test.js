// @flow
import { assert } from "chai"
import { INITIAL_STATE } from "redux-hammock/constants"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeContributors } from "../factories/channels"

describe("channelContributors reducers", () => {
  let helper, store, dispatchThen, contributors

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    contributors = makeContributors("username")
    dispatchThen = helper.store.createDispatchThen(
      state => state.channelContributors
    )
    helper.getChannelContributorsStub.returns(Promise.resolve(contributors))
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should have some initial state", () => {
    assert.deepEqual(store.getState().channelContributors, {
      ...INITIAL_STATE,
      data: new Map()
    })
  })

  it("should handle a response with data", () => {
    const { requestType, successType } = actions.channelContributors.get
    return dispatchThen(actions.channelContributors.get("channelname"), [
      requestType,
      successType
    ]).then(({ data }) => {
      assert.deepEqual(contributors, data.get("channelname"))
    })
  })

  it("should handle an empty response ok", () => {
    const { requestType, successType } = actions.channelContributors.get
    helper.getChannelContributorsStub.returns(Promise.resolve([]))
    return dispatchThen(actions.channelContributors.get("channelname"), [
      requestType,
      successType
    ]).then(({ data }) => {
      assert.deepEqual([], data.get("channelname"))
    })
  })
})

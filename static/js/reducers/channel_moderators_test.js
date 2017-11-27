// @flow
import { assert } from "chai"
import { INITIAL_STATE } from "redux-hammock/constants"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeModerators } from "../factories/channels"

describe("channelModerators reducers", () => {
  let helper, store, dispatchThen, moderators

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    moderators = makeModerators("username")
    dispatchThen = helper.store.createDispatchThen(
      state => state.channelModerators
    )
    helper.getChannelModeratorsStub.returns(Promise.resolve(moderators))
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should have some initial state", () => {
    assert.deepEqual(store.getState().channelModerators, {
      ...INITIAL_STATE,
      data: new Map()
    })
  })

  it("should handle a response with data", () => {
    const { requestType, successType } = actions.channelModerators.get
    return dispatchThen(actions.channelModerators.get("channelname"), [
      requestType,
      successType
    ]).then(({ data }) => {
      assert.deepEqual(moderators, data.get("channelname"))
    })
  })

  it("should handle an empty response ok", () => {
    const { requestType, successType } = actions.channelModerators.get
    helper.getChannelModeratorsStub.returns(Promise.resolve(makeModerators()))
    return dispatchThen(actions.channelModerators.get("channelname"), [
      requestType,
      successType
    ]).then(({ data }) => {
      assert.deepEqual([], data.get("channelname"))
    })
  })
})

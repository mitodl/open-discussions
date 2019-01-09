// @flow
import { assert } from "chai"
import { INITIAL_STATE } from "redux-hammock/constants"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannelInvite } from "../factories/channels"

describe("channelInvitations reducers", () => {
  let helper, store, dispatchThen, newInvite

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    newInvite = makeChannelInvite()
    dispatchThen = helper.store.createDispatchThen(
      state => state.channelInvitations
    )
    helper.addChannelInvitationStub.returns(Promise.resolve(newInvite))
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should have some initial state", () => {
    assert.deepEqual(store.getState().channelInvitations, {
      ...INITIAL_STATE,
      data: new Map()
    })
  })

  it("should add a new contributor to the list", async () => {
    const channelName = "a_channel"

    const { data } = await dispatchThen(
      actions.channelInvitations.post(channelName, newInvite.email),
      [
        actions.channelInvitations.post.requestType,
        actions.channelInvitations.post.successType
      ]
    )
    assert.deepEqual(data.get(channelName), [newInvite])
  })

  it("should check for duplicates when adding a new contributor", async () => {
    const channelName = "a_channel"

    // invite the same email twice since it's the only way to currently get a duplicate email into this reducer
    await dispatchThen(
      actions.channelInvitations.post(channelName, newInvite.email),
      [
        actions.channelInvitations.post.requestType,
        actions.channelInvitations.post.successType
      ]
    )

    const { data } = await dispatchThen(
      actions.channelInvitations.post(channelName, newInvite.email),
      [
        actions.channelInvitations.post.requestType,
        actions.channelInvitations.post.successType
      ]
    )
    assert.deepEqual(data.get(channelName), [newInvite])
  })
})

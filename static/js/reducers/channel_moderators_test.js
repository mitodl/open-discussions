// @flow
import { assert } from "chai"
import { INITIAL_STATE } from "redux-hammock/constants"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeModerator, makeModerators } from "../factories/channels"

describe("channelModerators reducers", () => {
  let helper, store, dispatchThen, moderators, newModerator

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    moderators = makeModerators("username")
    newModerator = makeModerator()
    dispatchThen = helper.store.createDispatchThen(
      state => state.channelModerators
    )
    helper.getChannelModeratorsStub.returns(Promise.resolve(moderators))
    helper.addChannelModeratorStub.returns(Promise.resolve(newModerator))
    helper.deleteChannelModeratorStub.returns(Promise.resolve())
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
    helper.getChannelModeratorsStub.returns(Promise.resolve([]))
    return dispatchThen(actions.channelModerators.get("channelname"), [
      requestType,
      successType
    ]).then(({ data }) => {
      assert.deepEqual([], data.get("channelname"))
    })
  })

  it("should add a new moderator to the list", async () => {
    const channelName = "a_channel"
    await dispatchThen(actions.channelModerators.get(channelName), [
      actions.channelModerators.get.requestType,
      actions.channelModerators.get.successType
    ])

    const { data } = await dispatchThen(
      actions.channelModerators.post(channelName, newModerator.moderator_name),
      [
        actions.channelModerators.post.requestType,
        actions.channelModerators.post.successType
      ]
    )
    assert.deepEqual(data.get(channelName), [...moderators, newModerator])
  })

  it("should filter out duplicates when adding a new moderator", async () => {
    const channelName = "a_channel"
    await dispatchThen(actions.channelModerators.get(channelName), [
      actions.channelModerators.get.requestType,
      actions.channelModerators.get.successType
    ])

    const existingModerator = moderators[0]
    helper.addChannelModeratorStub.returns(Promise.resolve(existingModerator))

    const { data } = await dispatchThen(
      actions.channelModerators.post(
        channelName,
        existingModerator.moderator_name
      ),
      [
        actions.channelModerators.post.requestType,
        actions.channelModerators.post.successType
      ]
    )
    assert.deepEqual(data.get(channelName), [
      ...moderators.filter(
        _moderator =>
          _moderator.moderator_name !== existingModerator.moderator_name
      ),
      existingModerator
    ])
  })

  it("should remove a moderator from the list", async () => {
    const channelName = "a_channel"
    await dispatchThen(actions.channelModerators.get(channelName), [
      actions.channelModerators.get.requestType,
      actions.channelModerators.get.successType
    ])

    const existingModerator = moderators[0]
    const { data } = await dispatchThen(
      actions.channelModerators.delete(
        channelName,
        existingModerator.moderator_name
      ),
      [
        actions.channelModerators.delete.requestType,
        actions.channelModerators.delete.successType
      ]
    )
    assert.deepEqual(
      data.get(channelName),
      moderators.filter(
        moderator =>
          moderator.moderator_name !== existingModerator.moderator_name
      )
    )
  })
})

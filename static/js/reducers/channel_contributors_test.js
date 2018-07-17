// @flow
import { assert } from "chai"
import { INITIAL_STATE } from "redux-hammock/constants"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeContributor, makeContributors } from "../factories/channels"

describe("channelContributors reducers", () => {
  let helper, store, dispatchThen, contributors, newContributor

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    contributors = makeContributors("username")
    newContributor = makeContributor()
    dispatchThen = helper.store.createDispatchThen(
      state => state.channelContributors
    )
    helper.getChannelContributorsStub.returns(Promise.resolve(contributors))
    helper.addChannelContributorStub.returns(Promise.resolve(newContributor))
    helper.deleteChannelContributorStub.returns(Promise.resolve())
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

  it("should add a new contributor to the list", async () => {
    const channelName = "a_channel"
    await dispatchThen(actions.channelContributors.get(channelName), [
      actions.channelContributors.get.requestType,
      actions.channelContributors.get.successType
    ])

    const { data } = await dispatchThen(
      actions.channelContributors.post(
        channelName,
        newContributor.contributor_name
      ),
      [
        actions.channelContributors.post.requestType,
        actions.channelContributors.post.successType
      ]
    )
    assert.deepEqual(data.get(channelName), [...contributors, newContributor])
  })

  it("should check for duplicates when adding a new contributor", async () => {
    const channelName = "a_channel"
    await dispatchThen(actions.channelContributors.get(channelName), [
      actions.channelContributors.get.requestType,
      actions.channelContributors.get.successType
    ])

    const existingContributor = contributors[0]
    helper.addChannelContributorStub.returns(
      Promise.resolve(existingContributor)
    )

    const { data } = await dispatchThen(
      actions.channelContributors.post(
        channelName,
        existingContributor.contributor_name
      ),
      [
        actions.channelContributors.post.requestType,
        actions.channelContributors.post.successType
      ]
    )
    assert.deepEqual(data.get(channelName), contributors)
  })

  it("should remove a contributor from the list", async () => {
    const channelName = "a_channel"
    await dispatchThen(actions.channelContributors.get(channelName), [
      actions.channelContributors.get.requestType,
      actions.channelContributors.get.successType
    ])

    const existingContributor = contributors[0]
    const { data } = await dispatchThen(
      actions.channelContributors.delete(
        channelName,
        existingContributor.contributor_name
      ),
      [
        actions.channelContributors.delete.requestType,
        actions.channelContributors.delete.successType
      ]
    )
    assert.deepEqual(
      data.get(channelName),
      contributors.filter(
        contributor =>
          contributor.contributor_name !== existingContributor.contributor_name
      )
    )
  })
})

// @flow
import { assert } from "chai"
import { INITIAL_STATE } from "redux-hammock/constants"

import { actions } from "../actions"
import { evictPostsForChannel } from "../actions/posts_for_channel"
import IntegrationTestHelper from "../util/integration_test_helper"

import { makeChannelPostList } from "../factories/posts"

describe("postsForChannel reducer", () => {
  let helper, store, dispatchThen

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    dispatchThen = store.createDispatchThen(state => state.postsForChannel)
    helper.getPostsForChannelStub.returns(
      Promise.resolve({ posts: makeChannelPostList() })
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should have some initial state", () => {
    assert.deepEqual(store.getState().postsForChannel, {
      ...INITIAL_STATE,
      data: new Map()
    })
  })

  it("should let you get the posts for a channel", async () => {
    const { requestType, successType } = actions.postsForChannel.get
    const { data } = await dispatchThen(
      actions.postsForChannel.get("channel"),
      [requestType, successType]
    )
    const channel = data.get("channel").postIds
    assert.isArray(channel)
    assert.lengthOf(channel, 20)
  })

  it("should support multiple channels", async () => {
    await Promise.all([
      store.dispatch(actions.postsForChannel.get("first")),
      store.dispatch(actions.postsForChannel.get("second"))
    ])
    const { postsForChannel: { data } } = store.getState()
    assert.isArray(data.get("first").postIds)
    assert.isArray(data.get("second").postIds)
    assert.equal(data.size, 2)
  })

  it("should clear data for a single channel", async () => {
    await Promise.all([
      store.dispatch(actions.postsForChannel.get("first")),
      store.dispatch(actions.postsForChannel.get("second"))
    ])
    await store.dispatch(evictPostsForChannel("second"))
    const { postsForChannel: { data } } = store.getState()
    assert.equal(data.size, 1)
    assert.isArray(data.get("first").postIds)
    assert.isUndefined(data.get("second"))
  })
})

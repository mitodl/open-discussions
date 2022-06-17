// @flow
import { assert } from "chai"
import { INITIAL_STATE } from "redux-hammock/constants"
import sinon from "sinon"

import { actions } from "../actions"
import { evictPostsForChannel } from "../actions/posts_for_channel"
import IntegrationTestHelper from "../util/integration_test_helper"
import * as libPosts from "../lib/posts"

import { makeChannelPostList } from "../factories/posts"

describe("postsForChannel reducer", () => {
  let helper, store, dispatchThen, posts

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    dispatchThen = store.createDispatchThen(state => state.postsForChannel)
    posts = makeChannelPostList()
    helper.getPostsForChannelStub.returns(Promise.resolve({ posts }))
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
    const {
      postsForChannel: { data }
    } = store.getState()
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
    const {
      postsForChannel: { data }
    } = store.getState()
    assert.equal(data.size, 1)
    assert.isArray(data.get("first").postIds)
    assert.isUndefined(data.get("second"))
  })

  it(`uses mapPostListResponse to update existing posts`, async () => {
    const mapStub = helper.sandbox.stub(libPosts, "mapPostListResponse")
    const returnValue = {
      pagination: "pagination",
      postIds:    "postIds"
    }
    mapStub.returns(returnValue)

    const { requestType, successType } = actions.postsForChannel.get
    const { data } = await dispatchThen(
      actions.postsForChannel.get("channel"),
      [requestType, successType]
    )
    assert.deepEqual(data.get("channel"), returnValue)
    sinon.assert.calledWith(
      mapStub,
      { posts: posts },
      {
        pagination: null,
        postIds:    []
      }
    )

    mapStub.reset()
    const newPosts = makeChannelPostList()
    helper.getPostsForChannelStub.returns(Promise.resolve({ posts: newPosts }))
    await dispatchThen(actions.postsForChannel.get("channel"), [
      requestType,
      successType
    ])
    sinon.assert.calledWith(mapStub, { posts: newPosts }, returnValue)
  })
})

// @flow
import { assert } from "chai"
import { INITIAL_STATE } from "redux-hammock/constants"
import R from "ramda"

import { actions } from "../actions"
import { setChannelData } from "../actions/channel"
import { setPostData } from "../actions/post"
import IntegrationTestHelper from "../util/integration_test_helper"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { mapPostListResponse } from "../lib/posts"
import { frontPageEndpoint } from "./frontpage"

import { makePost, makeChannelPostList } from "../factories/posts"
import { makeChannel, makeChannelList } from "../factories/channels"

describe("reducers", () => {
  let helper, store, dispatchThen

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("posts reducer", () => {
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.posts)
      helper.getPostStub.resetBehavior() // needed because ``callsFake`` doesn't override the ``throws``
      helper.getPostStub.callsFake(async id => {
        const post = makePost()
        post.id = id
        return post
      })
    })

    it("should have some initial state", () => {
      assert.deepEqual(store.getState().posts, {
        ...INITIAL_STATE,
        data: new Map()
      })
    })

    it("should let you fetch a post", () => {
      const { requestType, successType } = actions.posts.get
      return dispatchThen(actions.posts.get("mypostid"), [
        requestType,
        successType
      ]).then(posts => {
        const post = posts.data.get("mypostid")
        assert.equal(post.id, "mypostid")
        assert.isString(post.title)
      })
    })

    it("should allow for multiple posts to coexist", () => {
      return Promise.all([
        store.dispatch(actions.posts.get("first")),
        store.dispatch(actions.posts.get("second"))
      ]).then(() => {
        const {
          posts: { data }
        } = store.getState()
        assert.equal(data.get("first").id, "first")
        assert.equal(data.get("second").id, "second")
        assert.equal(data.size, 2)
      })
    })

    it("should allow setting a post record separately", () => {
      const post = makePost()
      post.id = "my great post wow"
      store.dispatch(setPostData(post))
      const { posts } = store.getState()
      assert.deepEqual(post, posts.data.get("my great post wow"))
      assert.isTrue(posts.loaded)
    })

    it("should let you set a list of posts separately", () => {
      const posts = makeChannelPostList()
      store.dispatch(setPostData(posts))
      const {
        posts: { data }
      } = store.getState()
      assert.equal(data.size, 20)
    })
  })

  describe("channels reducer", () => {
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.channels)
      helper.getChannelStub.resetBehavior() // needed because ``callsFake`` doesn't override the ``throws``
      helper.getChannelStub.callsFake(async name => {
        const channel = makeChannel()
        channel.name = name
        return channel
      })
      helper.createChannelStub.resetBehavior()
      helper.createChannelStub.callsFake(async channel => channel)
      helper.updateChannelStub.resetBehavior()
      helper.updateChannelStub.callsFake(async channel => channel)
    })

    it("should have some initial state", () => {
      assert.deepEqual(store.getState().channels, {
        ...INITIAL_STATE,
        data: new Map()
      })
    })

    it("should let you get a channel", () => {
      const { requestType, successType } = actions.channels.get
      return dispatchThen(actions.channels.get("wowowowow"), [
        requestType,
        successType
      ]).then(channels => {
        const channel = channels.data.get("wowowowow")
        assert.isString(channel.name)
        assert.equal(channel.channel_type, "public")
      })
    })

    it("should support multiple channels", () => {
      return Promise.all([
        store.dispatch(actions.channels.get("first")),
        store.dispatch(actions.channels.get("second"))
      ]).then(() => {
        const {
          channels: { data }
        } = store.getState()
        assert.equal(data.get("first").name, "first")
        assert.equal(data.get("second").name, "second")
        assert.equal(data.size, 2)
      })
    })

    it("should let you create a channel", async () => {
      const { requestType, successType } = actions.channels.post
      const channel = makeChannel()
      const channels = await dispatchThen(actions.channels.post(channel), [
        requestType,
        successType
      ])
      assert.deepEqual(channel, channels.data.get(channel.name))
    })

    it("should let you set a list of channels separately", () => {
      const numChannels = 9
      const channels = makeChannelList(numChannels)
      store.dispatch(setChannelData(channels))
      let data = store.getState().channels.data
      assert.equal(data.size, numChannels)
      for (const channel of channels) {
        assert.deepEqual(data.get(channel.name), channel)
      }

      // it should also let you overwrite a channel
      const newChannel = makeChannel()
      const oldChannel = channels[1]
      newChannel.name = oldChannel.name
      assert.notEqual(newChannel.title, oldChannel.title)
      store.dispatch(setChannelData([newChannel]))
      data = store.getState().channels.data
      for (const channel of channels) {
        if (channel.name === newChannel.name) {
          assert.deepEqual(data.get(channel.name), newChannel)
        } else {
          assert.deepEqual(data.get(channel.name), channel)
        }
      }
    })

    it("should let you update a channel", async () => {
      const { requestType, successType } = actions.channels.patch
      const channel = makeChannel()
      const channels = await dispatchThen(actions.channels.patch(channel), [
        requestType,
        successType
      ])
      assert.deepEqual(channel, channels.data.get(channel.name))
    })
  })

  describe("frontpage reducer", () => {
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.frontpage)
      helper.getFrontpageStub.returns(
        Promise.resolve({ posts: makeChannelPostList() })
      )
    })

    it("should have some initial state", () => {
      assert.deepEqual(store.getState().frontpage, {
        ...INITIAL_STATE,
        data: {
          pagination: null,
          postIds:    []
        }
      })
    })

    it("should let you get the frontpage", async () => {
      const { requestType, successType } = actions.frontpage.get
      const { data } = await dispatchThen(actions.frontpage.get(), [
        requestType,
        successType
      ])
      assert.lengthOf(data.postIds, 20)
    })

    it("uses mapPostListResponse to combine posts and take pagination into account", async () => {
      assert.equal(frontPageEndpoint.getSuccessHandler, mapPostListResponse)
    })
  })

  describe("subscribed channels (getChannels) reducer", () => {
    let channels

    beforeEach(() => {
      channels = makeChannelList()
      dispatchThen = store.createDispatchThen(state => state.subscribedChannels)
      helper.getChannelsStub.returns(Promise.resolve(channels))
    })

    it("should have some default state", () => {
      assert.deepEqual(store.getState().subscribedChannels, {
        ...INITIAL_STATE,
        data: []
      })
    })

    it("should let you get subscribed channels", async () => {
      const { requestType, successType } = actions.subscribedChannels.get
      const { data } = await dispatchThen(actions.subscribedChannels.get(), [
        requestType,
        successType
      ])
      assert.deepEqual(data, channels.map(R.prop("name")))
    })

    it("should be possible to pull out relevant info using the selector", async () => {
      const { requestType, successType } = actions.subscribedChannels.get
      await dispatchThen(actions.subscribedChannels.get(), [
        requestType,
        successType
      ])
      store.dispatch(setChannelData(channels))
      assert.deepEqual(getSubscribedChannels(store.getState()), channels)
    })

    it("selector should return [] if empty", () => {
      assert.deepEqual(getSubscribedChannels(store.getState()), [])
    })
  })
})

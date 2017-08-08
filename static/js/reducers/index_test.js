// @flow
import { assert } from "chai"
import { INITIAL_STATE } from "redux-hammock/constants"

import { actions } from "../actions"
import { setChannelData } from "../actions/channel"
import { setPostData } from "../actions/post"
import IntegrationTestHelper from "../util/integration_test_helper"

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
        let post = makePost()
        post.id = id
        return post
      })
    })

    it("should have some initial state", () => {
      assert.deepEqual(store.getState().posts, { ...INITIAL_STATE, data: new Map() })
    })

    it("should let you fetch a post", () => {
      const { requestType, successType } = actions.posts.get
      return dispatchThen(actions.posts.get("mypostid"), [requestType, successType]).then(posts => {
        let post = posts.data.get("mypostid")
        assert.equal(post.id, "mypostid")
        assert.isString(post.title)
      })
    })

    it("should allow for multiple posts to coexist", () => {
      return Promise.all([
        store.dispatch(actions.posts.get("first")),
        store.dispatch(actions.posts.get("second"))
      ]).then(() => {
        let { posts: { data } } = store.getState()
        assert.equal(data.get("first").id, "first")
        assert.equal(data.get("second").id, "second")
        assert.equal(data.size, 2)
      })
    })

    it("should allow setting a post record separately", () => {
      let post = makePost()
      post.id = "my great post wow"
      store.dispatch(setPostData(post))
      const { posts } = store.getState()
      assert.deepEqual(post, posts.data.get("my great post wow"))
      assert.isTrue(posts.loaded)
    })

    it("should let you set a list of posts separately", () => {
      let posts = makeChannelPostList()
      store.dispatch(setPostData(posts))
      const { posts: { data } } = store.getState()
      assert.equal(data.size, 20)
    })
  })

  describe("channels reducer", () => {
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.channels)
      helper.getChannelStub.resetBehavior() // needed because ``callsFake`` doesn't override the ``throws``
      helper.getChannelStub.callsFake(async name => {
        let channel = makeChannel()
        channel.name = name
        return channel
      })
      helper.createChannelStub.resetBehavior()
      helper.createChannelStub.callsFake(async channel => channel)
    })

    it("should have some initial state", () => {
      assert.deepEqual(store.getState().channels, { ...INITIAL_STATE, data: new Map() })
    })

    it("should let you get a channel", () => {
      const { requestType, successType } = actions.channels.get
      return dispatchThen(actions.channels.get("wowowowow"), [requestType, successType]).then(channels => {
        let channel = channels.data.get("wowowowow")
        assert.isString(channel.name)
        assert.equal(channel.channel_type, "public")
      })
    })

    it("should support multiple channels", () => {
      return Promise.all([
        store.dispatch(actions.channels.get("first")),
        store.dispatch(actions.channels.get("second"))
      ]).then(() => {
        let { channels: { data } } = store.getState()
        assert.equal(data.get("first").name, "first")
        assert.equal(data.get("second").name, "second")
        assert.equal(data.size, 2)
      })
    })

    it("should let you create a channel", async () => {
      const { requestType, successType } = actions.channels.post
      let channel = makeChannel()
      let channels = await dispatchThen(actions.channels.post(channel), [requestType, successType])
      assert.deepEqual(channel, channels.data.get(channel.name))
    })

    it("should let you set a list of channels separately", () => {
      const numChannels = 9
      let channels = makeChannelList(numChannels)
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
  })

  describe("postsForChannel reducer", () => {
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.postsForChannel)
      helper.getPostsForChannelStub.returns(Promise.resolve(makeChannelPostList()))
    })

    it("should have some initial state", () => {
      assert.deepEqual(store.getState().postsForChannel, { ...INITIAL_STATE, data: new Map() })
    })

    it("should let you get the posts for a channel", () => {
      const { requestType, successType } = actions.postsForChannel.get
      return dispatchThen(actions.postsForChannel.get("channel"), [requestType, successType]).then(({ data }) => {
        let channel = data.get("channel")
        assert.isArray(channel)
        assert.lengthOf(channel, 20)
      })
    })

    it("should support multiple channels", () => {
      return Promise.all([
        store.dispatch(actions.postsForChannel.get("first")),
        store.dispatch(actions.postsForChannel.get("second"))
      ]).then(() => {
        let { postsForChannel: { data } } = store.getState()
        assert.isArray(data.get("first"))
        assert.isArray(data.get("second"))
        assert.equal(data.size, 2)
      })
    })
  })

  describe("frontpage reducer", () => {
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.frontpage)
      helper.getFrontpageStub.returns(Promise.resolve(makeChannelPostList()))
    })

    it("should have some initial state", () => {
      assert.deepEqual(store.getState().frontpage, { ...INITIAL_STATE, data: [] })
    })

    it("should let you get the frontpage", () => {
      const { requestType, successType } = actions.frontpage.get
      return dispatchThen(actions.frontpage.get(), [requestType, successType]).then(({ data }) => {
        assert.lengthOf(data, 20)
      })
    })
  })
})

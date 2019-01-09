import sinon from "sinon"
import { assert } from "chai"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"
import { PATCH, POST, DELETE } from "redux-hammock/constants"

import {
  getChannel,
  getChannels,
  getPostsForChannel,
  createChannel,
  updateChannel,
  getChannelContributors,
  addChannelContributor,
  deleteChannelContributor
} from "./channels"
import {
  makeChannel,
  makeChannelList,
  makeContributors,
  makeContributor
} from "../../factories/channels"
import { makeChannelPostList } from "../../factories/posts"

describe("Channels API", () => {
  let fetchJSONStub, fetchStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
    fetchStub = sandbox.stub(fetchFuncs, "fetchWithCSRF")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("gets channel posts", async () => {
    const posts = makeChannelPostList()
    fetchJSONStub.returns(Promise.resolve({ posts }))

    const result = await getPostsForChannel("channelone", {})
    assert.ok(fetchJSONStub.calledWith("/api/v0/channels/channelone/posts/"))
    assert.deepEqual(result.posts, posts)
  })

  it("gets channel posts with pagination params", async () => {
    const posts = makeChannelPostList()
    fetchJSONStub.returns(Promise.resolve({ posts }))

    const result = await getPostsForChannel("channelone", {
      before: "abc",
      after:  "def",
      count:  5
    })
    assert.ok(
      fetchJSONStub.calledWith(
        `/api/v0/channels/channelone/posts/?after=def&before=abc&count=5`
      )
    )
    assert.deepEqual(result.posts, posts)
  })

  it("gets channel", async () => {
    const channel = makeChannel()
    fetchJSONStub.returns(Promise.resolve(channel))

    const result = await getChannel("channelone")
    assert.ok(fetchJSONStub.calledWith("/api/v0/channels/channelone/"))
    assert.deepEqual(result, channel)
  })

  it("gets a list of channels", async () => {
    const channelList = makeChannelList()
    fetchJSONStub.returns(Promise.resolve(channelList))

    const result = await getChannels()
    assert.ok(fetchJSONStub.calledWith("/api/v0/channels/"))
    assert.deepEqual(result, channelList)
  })

  it("creates a channel", async () => {
    const channel = makeChannel()
    fetchJSONStub.returns(Promise.resolve(channel))

    const input = {
      name:               "name",
      title:              "title",
      description:        "description",
      public_description: "public_description",
      channel_type:       "public"
    }

    const result = await createChannel(input)
    assert.ok(
      fetchJSONStub.calledWith(`/api/v0/channels/`, {
        method: POST,
        body:   JSON.stringify({
          ...input
        })
      })
    )
    assert.deepEqual(result, channel)
  })

  it("updates a channel", async () => {
    const channel = makeChannel()
    fetchJSONStub.returns(Promise.resolve(channel))

    const input = {
      name:               "name",
      title:              "title",
      description:        "description",
      public_description: "public_description",
      channel_type:       "public"
    }

    const result = await updateChannel(input)
    assert.ok(
      fetchJSONStub.calledWith(`/api/v0/channels/${input.name}/`, {
        method: PATCH,
        body:   JSON.stringify({
          title:              input.title,
          description:        input.description,
          public_description: input.public_description,
          channel_type:       input.channel_type
        })
      })
    )
    assert.deepEqual(result, channel)
  })

  describe("contributors", () => {
    it("gets a list of contributors", async () => {
      const channelName = "channel_name"
      const contributors = makeContributors()

      fetchJSONStub.returns(Promise.resolve(contributors))

      assert.deepEqual(contributors, await getChannelContributors(channelName))

      assert.ok(
        fetchJSONStub.calledWith(
          `/api/v0/channels/${channelName}/contributors/`
        )
      )
    })

    it("adds a contributor", async () => {
      const channelName = "channel_name"
      const contributor = makeContributor()

      fetchJSONStub.returns(Promise.resolve(contributor))

      assert.deepEqual(
        contributor,
        await addChannelContributor(channelName, contributor.email)
      )

      assert.ok(
        fetchJSONStub.calledWith(
          `/api/v0/channels/${channelName}/contributors/`
        )
      )
      assert.deepEqual(fetchJSONStub.args[0][1], {
        method: POST,
        body:   JSON.stringify({
          email: contributor.email
        })
      })
    })

    it("removes a contributor", async () => {
      const channelName = "channel_name"
      const contributor = makeContributor()

      fetchJSONStub.returns(Promise.resolve(contributor))

      await deleteChannelContributor(channelName, contributor.contributor_name)

      assert.ok(
        fetchStub.calledWith(
          `/api/v0/channels/${channelName}/contributors/${
            contributor.contributor_name
          }/`
        )
      )
      assert.deepEqual(fetchStub.args[0][1], {
        method: DELETE
      })
    })
  })
})

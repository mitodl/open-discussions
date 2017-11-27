// @flow
import { assert } from "chai"

import { makeChannel, makeModerators } from "./channels"

describe("channels factory", () => {
  it("should make a channel", () => {
    const channel = makeChannel()
    assert.isString(channel.name)
    assert.isString(channel.title)
    assert.equal(channel.channel_type, "public")
    assert.isString(channel.public_description)
    assert.isNumber(channel.num_users)
  })

  it("should make an empty moderators list", () => {
    const moderators = makeModerators()
    assert.deepEqual(moderators, [])
  })

  it("should make a moderators list with username", () => {
    const moderators = makeModerators("username")
    assert.deepEqual(moderators, [
      {
        moderator_name: "username"
      }
    ])
  })
})

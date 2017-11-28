// @flow
import { assert } from "chai"

import {
  CHANNEL_TYPE_PUBLIC,
  newChannelForm,
  editChannelForm,
  isModerator
} from "./channels"
import { makeModerators, makeChannel } from "../factories/channels"

describe("Channel utils", () => {
  it("newChannelForm should return a new channel form with empty values and public type", () => {
    assert.deepEqual(newChannelForm(), {
      title:              "",
      name:               "",
      description:        "",
      public_description: "",
      channel_type:       CHANNEL_TYPE_PUBLIC
    })
  })

  it("editChannelForm should return a copy of the channel data, excluding extraneous fields", () => {
    const channel = makeChannel()
    // num_users shouldn't be present
    assert.deepEqual(editChannelForm(channel), {
      title:              channel.title,
      name:               channel.name,
      description:        channel.description,
      public_description: channel.public_description,
      channel_type:       channel.channel_type
    })
  })

  it("isModerator should return true for a moderator user", () => {
    assert.isTrue(isModerator(makeModerators("username"), "username"))
  })

  it("isModerator should return false for a regular user", () => {
    assert.isFalse(isModerator(makeModerators(), "username"))
  })
})

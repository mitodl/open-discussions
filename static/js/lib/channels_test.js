// @flow
import { assert } from "chai"

import { CHANNEL_TYPE_PUBLIC, newChannelForm, isModerator } from "./channels"
import { makeModerators } from "../factories/channels"

describe("Channel utils", () => {
  it("newChannelForm should return a new channel form with empty values and public type", () => {
    assert.deepEqual(newChannelForm(), {
      title:              "",
      name:               "",
      public_description: "",
      channel_type:       CHANNEL_TYPE_PUBLIC
    })
  })

  it("isModerator should return true for a moderator user", () => {
    assert.isTrue(isModerator(makeModerators("username"), "username"))
  })

  it("isModerator should return false for a regular user", () => {
    assert.isFalse(isModerator(makeModerators(), "username"))
  })
})

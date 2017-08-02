// @flow
import { assert } from "chai"

import { CHANNEL_TYPE_PUBLIC, newChannelForm } from "./channels"

describe("Channel utils", () => {
  it("should return a new channel form with empty values and public type", () => {
    assert.deepEqual(newChannelForm(), {
      title:              "",
      name:               "",
      public_description: "",
      channel_type:       CHANNEL_TYPE_PUBLIC
    })
  })
})

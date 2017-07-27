// @flow
import { assert } from "chai"

import { CHANNEL_TYPE_PUBLIC, newChannel } from "./channels"

describe("Channel utils", () => {
  it("should return a new channel with empty values and public type", () => {
    assert.deepEqual(newChannel(), {
      title:              "",
      name:               "",
      public_description: "",
      channel_type:       CHANNEL_TYPE_PUBLIC
    })
  })
})

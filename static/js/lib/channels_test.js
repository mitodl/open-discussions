// @flow
import { assert } from "chai"

import {
  CHANNEL_TYPE_PUBLIC,
  CHANNEL_TYPE_RESTRICTED,
  CHANNEL_TYPE_PRIVATE,
  newChannelForm,
  editChannelForm,
  isModerator,
  userCanPost
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

  describe("isModerator", () => {
    it("should return true for a moderator user", () => {
      assert.isTrue(isModerator(makeModerators("username"), "username"))
    })

    it("should return false for a regular user", () => {
      assert.isFalse(isModerator(makeModerators(), "username"))
    })
  })

  describe("userCanPost", () => {
    [
      [CHANNEL_TYPE_PUBLIC, false, false, true],
      [CHANNEL_TYPE_RESTRICTED, false, false, false],
      [CHANNEL_TYPE_PRIVATE, false, false, false],
      [CHANNEL_TYPE_PRIVATE, true, false, true],
      [CHANNEL_TYPE_PRIVATE, false, true, true],
      [CHANNEL_TYPE_RESTRICTED, true, true, true]
    ].forEach(([channelType, isModerator, isContributor, expected]) => {
      it(`${
        expected ? "shows" : "doesn't show"
      } the submit button when channelType is ${channelType}${
        isModerator ? "and the user is a moderator " : ""
      }${isContributor ? "and the user is a contributor" : ""}`, () => {
        const channel: Object = {
          ...makeChannel(),
          channel_type:        channelType,
          user_is_moderator:   isModerator,
          user_is_contributor: isContributor
        }
        assert.equal(userCanPost(channel), expected)
      })
    })
  })
})

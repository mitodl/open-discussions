// @flow
import { assert } from "chai"

import {
  CHANNEL_TYPE_PUBLIC,
  CHANNEL_TYPE_RESTRICTED,
  CHANNEL_TYPE_PRIVATE,
  newChannelForm,
  editChannelForm,
  isModerator,
  userCanPost,
  LINK_TYPE_ANY,
  LINK_TYPE_TEXT,
  LINK_TYPE_LINK,
  updateLinkType,
  isLinkTypeChecked,
  isTextTabSelected
} from "./channels"
import { makeModerators, makeChannel } from "../factories/channels"

describe("Channel utils", () => {
  it("newChannelForm should return a new channel form with empty values and public type", () => {
    assert.deepEqual(newChannelForm(), {
      title:              "",
      name:               "",
      description:        "",
      public_description: "",
      channel_type:       CHANNEL_TYPE_PUBLIC,
      link_type:          LINK_TYPE_ANY
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
      channel_type:       channel.channel_type,
      link_type:          channel.link_type
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

  describe("updateLinkType", () => {
    [
      // If one checkbox is already checked and the other is now checked we have ANY to represent both.
      [LINK_TYPE_LINK, LINK_TYPE_TEXT, true, LINK_TYPE_ANY],
      [LINK_TYPE_TEXT, LINK_TYPE_LINK, true, LINK_TYPE_ANY],
      // If none is previously checked and a value is checked, the expected value is that value.
      ["", LINK_TYPE_TEXT, true, LINK_TYPE_TEXT],
      ["", LINK_TYPE_LINK, true, LINK_TYPE_LINK],
      // If both checkboxes are checked and one is unchecked, the value is the other one which is still checked.
      [LINK_TYPE_ANY, LINK_TYPE_TEXT, false, LINK_TYPE_LINK],
      [LINK_TYPE_ANY, LINK_TYPE_LINK, false, LINK_TYPE_TEXT],
      // If only one checkbox is checked and it's unchecked, use an empty string to represent nothing checked.
      // This case is invalid, it's only used to allow the user to have both unchecked at once. It should
      // fail validation on submit.
      [LINK_TYPE_TEXT, LINK_TYPE_TEXT, false, ""],
      [LINK_TYPE_LINK, LINK_TYPE_LINK, false, ""]
    ].forEach(([oldLinkType, value, checked, expected]) => {
      it(`has the right value when clicking a ${
        checked ? "checked" : "unchecked"
      } checkbox
       with value ${value} and the previous link type is ${oldLinkType}`, () => {
        assert.equal(updateLinkType(oldLinkType, value, checked), expected)
      })
    })
  })

  describe("isLinkTypeChecked", () => {
    [
      // If the link value is ANY all checkboxes are checked
      [LINK_TYPE_ANY, LINK_TYPE_TEXT, true],
      [LINK_TYPE_ANY, LINK_TYPE_LINK, true],
      // The value should be checked if it matches the link value
      [LINK_TYPE_TEXT, LINK_TYPE_TEXT, true],
      [LINK_TYPE_TEXT, LINK_TYPE_LINK, false],
      [LINK_TYPE_LINK, LINK_TYPE_TEXT, false],
      [LINK_TYPE_LINK, LINK_TYPE_LINK, true],
      // An empty string means no link value is checked
      ["", LINK_TYPE_TEXT, false],
      ["", LINK_TYPE_LINK, false]
    ].forEach(([linkType, value, expected]) => {
      it(`has a checked value of ${String(
        expected
      )} for a channel link type ${linkType} and for checkbox ${value}`, () => {
        assert.equal(isLinkTypeChecked(linkType, value), expected)
      })
    })
  })

  describe("isTextTabSelected", () => {
    [
      // no channel selected and default tab selected
      [null, null, true],
      // no channel selected, we should use whatever tab the user selected
      [null, LINK_TYPE_TEXT, true],
      [null, LINK_TYPE_LINK, false],
      // no tab selected but a channel is selected. Use TEXT if the channel supports it else use LINK
      [LINK_TYPE_ANY, null, true],
      [LINK_TYPE_TEXT, null, true],
      [LINK_TYPE_LINK, null, false],
      // if both are specified and they conflict, use the only tab type which is valid
      [LINK_TYPE_LINK, LINK_TYPE_TEXT, false],
      [LINK_TYPE_TEXT, LINK_TYPE_LINK, true],
      // If there is no conflict choose the one the user selected
      [LINK_TYPE_ANY, LINK_TYPE_TEXT, true],
      [LINK_TYPE_ANY, LINK_TYPE_LINK, false]
    ].forEach(([channelLinkType, postType, expected]) => {
      const postTypeDescription =
        postType === null
          ? "no tab was previously selected"
          : `${
            postType === LINK_TYPE_TEXT ? "text" : "link"
          } was previously selected`
      const channel = channelLinkType
        ? {
          ...makeChannel(),
          link_type: channelLinkType
        }
        : null
      const channelDescription =
        channel === null
          ? "no channel is selected"
          : `the channel link type is ${channel.link_type}`

      it(`${
        expected ? "text" : "link"
      } tab is selected if ${postTypeDescription} and ${channelDescription}`, () => {
        assert.equal(isTextTabSelected(postType, channel), expected)
      })
    })
  })
})

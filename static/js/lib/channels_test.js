// @flow
import { assert } from "chai"

import {
  CHANNEL_TYPE_PUBLIC,
  CHANNEL_TYPE_RESTRICTED,
  CHANNEL_TYPE_PRIVATE,
  newChannelForm,
  editChannelForm,
  userCanPost,
  LINK_TYPE_TEXT,
  LINK_TYPE_LINK,
  LINK_TYPE_ARTICLE,
  updatePostTypes,
  isLinkTypeAllowed,
  isPrivate
} from "./channels"
import { makeChannel } from "../factories/channels"

describe("Channel utils", () => {
  it("newChannelForm should return a new channel form with empty values and public type", () => {
    assert.deepEqual(newChannelForm(), {
      title:                 "",
      name:                  "",
      public_description:    "",
      channel_type:          CHANNEL_TYPE_PUBLIC,
      allowed_post_types:    [LINK_TYPE_TEXT, LINK_TYPE_LINK],
      membership_is_managed: false
    })
  })

  it("editChannelForm should return a copy of the channel data, excluding extraneous fields", () => {
    const channel = makeChannel()
    // num_users shouldn't be present
    assert.deepEqual(editChannelForm(channel), {
      title:                   channel.title,
      name:                    channel.name,
      public_description:      channel.public_description,
      channel_type:            channel.channel_type,
      allowed_post_types:      channel.allowed_post_types,
      moderator_notifications: false,
      ga_tracking_id:          channel.ga_tracking_id
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

  describe("updatePostTypes", () => {
    [
      // if this one type is missing
      [
        [LINK_TYPE_TEXT, LINK_TYPE_LINK],
        LINK_TYPE_ARTICLE,
        [LINK_TYPE_TEXT, LINK_TYPE_LINK, LINK_TYPE_ARTICLE]
      ],
      [
        [LINK_TYPE_TEXT, LINK_TYPE_ARTICLE],
        LINK_TYPE_LINK,
        [LINK_TYPE_TEXT, LINK_TYPE_LINK, LINK_TYPE_ARTICLE]
      ],
      [
        [LINK_TYPE_LINK, LINK_TYPE_ARTICLE],
        LINK_TYPE_TEXT,
        [LINK_TYPE_TEXT, LINK_TYPE_LINK, LINK_TYPE_ARTICLE]
      ],
      // if only one other option is selected
      [
        [LINK_TYPE_LINK],
        LINK_TYPE_ARTICLE,
        [LINK_TYPE_LINK, LINK_TYPE_ARTICLE]
      ],
      [
        [LINK_TYPE_TEXT],
        LINK_TYPE_ARTICLE,
        [LINK_TYPE_TEXT, LINK_TYPE_ARTICLE]
      ],
      [[LINK_TYPE_TEXT], LINK_TYPE_LINK, [LINK_TYPE_TEXT, LINK_TYPE_LINK]],
      [
        [LINK_TYPE_ARTICLE],
        LINK_TYPE_LINK,
        [LINK_TYPE_LINK, LINK_TYPE_ARTICLE]
      ],
      [[LINK_TYPE_LINK], LINK_TYPE_TEXT, [LINK_TYPE_TEXT, LINK_TYPE_LINK]],
      [[LINK_TYPE_ARTICLE], LINK_TYPE_TEXT, [LINK_TYPE_TEXT, LINK_TYPE_ARTICLE]]
    ].forEach(([leftTypes, value, rightTypes]) => {
      it(`has the right value when clicking a checked checkbox
       with value ${value} and the previous link type is ${leftTypes.toString()}`, () => {
        // $FlowFixMe: https://github.com/flow-typed/flow-typed/issues/696
        assert.sameMembers(updatePostTypes(leftTypes, value, true), rightTypes)
      })

      // checking for uncheck is just the reverse of the above
      it(`has the right value when clicking a unchecked checkbox
       with value ${value} and the previous link type is ${leftTypes.toString()}`, () => {
        // $FlowFixMe: https://github.com/flow-typed/flow-typed/issues/696
        assert.sameMembers(updatePostTypes(rightTypes, value, false), leftTypes)
      })
    })
  })

  describe("isLinkTypeAllowed", () => {
    const ALL_TYPES = [LINK_TYPE_TEXT, LINK_TYPE_LINK, LINK_TYPE_ARTICLE]

    //
    ;[
      // true cases
      [ALL_TYPES, LINK_TYPE_TEXT, true],
      [ALL_TYPES, LINK_TYPE_LINK, true],
      [ALL_TYPES, LINK_TYPE_ARTICLE, true],

      [[LINK_TYPE_TEXT, LINK_TYPE_LINK], LINK_TYPE_TEXT, true],
      [[LINK_TYPE_TEXT, LINK_TYPE_ARTICLE], LINK_TYPE_TEXT, true],
      [[LINK_TYPE_TEXT], LINK_TYPE_TEXT, true],

      [[LINK_TYPE_LINK, LINK_TYPE_TEXT], LINK_TYPE_LINK, true],
      [[LINK_TYPE_LINK, LINK_TYPE_ARTICLE], LINK_TYPE_LINK, true],
      [[LINK_TYPE_LINK], LINK_TYPE_LINK, true],

      [[LINK_TYPE_ARTICLE, LINK_TYPE_LINK], LINK_TYPE_ARTICLE, true],
      [[LINK_TYPE_ARTICLE, LINK_TYPE_TEXT], LINK_TYPE_ARTICLE, true],
      [[LINK_TYPE_ARTICLE], LINK_TYPE_ARTICLE, true],

      // false cases
      [[LINK_TYPE_ARTICLE, LINK_TYPE_LINK], LINK_TYPE_TEXT, false],
      [[LINK_TYPE_ARTICLE], LINK_TYPE_TEXT, false],
      [[LINK_TYPE_LINK], LINK_TYPE_TEXT, false],

      [[LINK_TYPE_ARTICLE, LINK_TYPE_TEXT], LINK_TYPE_LINK, false],
      [[LINK_TYPE_ARTICLE], LINK_TYPE_TEXT, false],
      [[LINK_TYPE_TEXT], LINK_TYPE_LINK, false],

      [[LINK_TYPE_LINK, LINK_TYPE_TEXT], LINK_TYPE_ARTICLE, false],
      [[LINK_TYPE_LINK], LINK_TYPE_ARTICLE, false],
      [[LINK_TYPE_TEXT], LINK_TYPE_ARTICLE, false]
    ].forEach(([allowedTypes, value, expected]) => {
      it(`${
        expected ? "should" : "should not"
      } show ${value} for a channel with allowed_post_types ${allowedTypes.toString()}`, () => {
        const channel = makeChannel()
        channel.allowed_post_types = allowedTypes

        assert.equal(isLinkTypeAllowed(channel, value), expected)
      })
    })

    //
    ALL_TYPES.forEach(linkType => {
      it(`should allow ${linkType} if the channel is null`, () => {
        assert.isTrue(isLinkTypeAllowed(null, linkType))
      })
    })
  })

  describe("isPrivate", () => {
    [[CHANNEL_TYPE_PRIVATE, true], [CHANNEL_TYPE_PUBLIC, false]].forEach(
      ([channelType, expRetVal]) => {
        it(`should return ${String(
          expRetVal
        )} when channel type=${channelType}`, () => {
          const channel = makeChannel()
          channel.channel_type = channelType
          assert.equal(isPrivate(channel), expRetVal)
        })
      }
    )
  })
})

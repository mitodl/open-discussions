// @flow
import casual from "casual-browserify"
import R from "ramda"

import {
  LINK_TYPE_TEXT,
  LINK_TYPE_LINK,
  LINK_TYPE_ARTICLE
} from "../lib/channels"
import { incrementer } from "../lib/util"

import type {
  Channel,
  Contributor,
  ChannelContributors,
  ChannelModerators,
  ChannelSubscribers,
  Moderator,
  Subscriber
} from "../flow/discussionTypes"

const incr = incrementer()

export const makeChannel = (privateChannel: boolean = false): Channel => {
  const hasAvatar = casual.coin_flip
  return {
    // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
    name:                  `channel_${incr.next().value}`,
    title:                 casual.title,
    channel_type:          privateChannel ? "private" : "public",
    public_description:    casual.description,
    num_users:             casual.integer(0, 500),
    user_is_contributor:   casual.coin_flip,
    user_is_subscriber:    casual.coin_flip,
    user_is_moderator:     casual.coin_flip,
    membership_is_managed: casual.coin_flip,
    ga_tracking_id:        casual.random_element(["UA-FAKE-01", null]),
    avatar:                hasAvatar ? "http://avatar.url" : null,
    avatar_small:          hasAvatar ? "http://avatar.small.url" : null,
    avatar_medium:         hasAvatar ? "http://avatar.medium.url" : null,
    banner:                casual.coin_flip ? "http://banner.url" : null,
    widget_list_id:        casual.integer(4, 99),
    allowed_post_types:    [LINK_TYPE_TEXT, LINK_TYPE_LINK, LINK_TYPE_ARTICLE]
  }
}

export const makeChannelList = (numChannels: number = 20) => {
  return R.range(0, numChannels).map(() => makeChannel(casual.boolean))
}

export const makeContributor = (username: ?string = null): Contributor => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  contributor_name: username || `${casual.word}_${incr.next().value}`,
  email:            casual.email,
  full_name:        casual.full_name
})

export const makeContributors = (
  username: ?string = null
): ChannelContributors => [
  makeContributor(username),
  makeContributor(null),
  makeContributor(null)
]

export const makeModerator = (
  username: ?string = null,
  isModerator: ?boolean
): Moderator => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  moderator_name: username || `${casual.word}_${incr.next().value}`,
  ...(isModerator
    ? {
      email:      casual.email,
      full_name:  casual.full_name,
      can_remove: casual.coin_flip
    }
    : {})
})

export const makeModerators = (
  username: ?string = null,
  isModerator: ?boolean
): ChannelModerators => [
  makeModerator(username, isModerator),
  makeModerator(null, isModerator),
  makeModerator(null, isModerator)
]

export const makeSubscriber = (username: ?string = null): Subscriber => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  subscriber_name: username || `${casual.word}_${incr.next().value}`
})

export const makeSubscribers = (
  username: ?string = null
): ChannelSubscribers => [
  makeSubscriber(username),
  makeSubscriber(null),
  makeSubscriber(null)
]

export const makeImage = (imageName: string) => ({
  image: {
    name: imageName
  },
  edit: new Blob([casual.word])
})

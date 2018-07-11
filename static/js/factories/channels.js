// @flow
import casual from "casual-browserify"
import R from "ramda"

import { LINK_TYPE_ANY } from "../lib/channels"
import { incrementer } from "../factories/util"

import type {
  Channel,
  Contributor,
  ChannelContributors,
  ChannelModerators,
  Moderator
} from "../flow/discussionTypes"

const incr = incrementer()

export const makeChannel = (privateChannel: boolean = false): Channel => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  name:                `channel_${incr.next().value}`,
  title:               casual.title,
  channel_type:        privateChannel ? "private" : "public",
  link_type:           LINK_TYPE_ANY,
  description:         casual.description,
  public_description:  casual.description,
  num_users:           casual.integer(0, 500),
  user_is_contributor: casual.coin_flip,
  user_is_moderator:   casual.coin_flip
})

export const makeChannelList = (numChannels: number = 20) => {
  return R.range(0, numChannels).map(() => makeChannel(Math.random() > 0.5))
}

export const makeContributor = (username: ?string = null): Contributor => ({
  contributor_name: username ? username : casual.word,
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
  moderator_name: username ? username : casual.word,
  ...(isModerator
    ? {
      email:     casual.email,
      full_name: casual.full_name
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

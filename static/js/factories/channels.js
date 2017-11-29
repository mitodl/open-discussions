// @flow
import casual from "casual-browserify"
import R from "ramda"

import type { Channel } from "../flow/discussionTypes"
import { incrementer } from "../factories/util"

const incr = incrementer()

export const makeChannel = (privateChannel: boolean = false): Channel => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  name:               `channel_${incr.next().value}`,
  title:              casual.title,
  channel_type:       privateChannel ? "private" : "public",
  description:        casual.description,
  public_description: casual.description,
  num_users:          casual.integer(0, 500)
})

export const makeChannelList = (numChannels: number = 20) => {
  return R.range(0, numChannels).map(() => makeChannel(Math.random() > 0.5))
}

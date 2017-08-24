// @flow
import { safeBulkGet } from "../lib/maps"

import type { Channel } from "../flow/discussionTypes"

export const getSubscribedChannels = (state: Object): Array<Channel> =>
  state.subscribedChannels.loaded
    ? safeBulkGet(state.subscribedChannels.data, state.channels.data)
    : []

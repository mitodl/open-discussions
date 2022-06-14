// @flow
import { GET, POST, DELETE, INITIAL_STATE } from "redux-hammock/constants"

import * as channelAPI from "../lib/api/channels"

export const channelSubscribersEndpoint = {
  name:         "channelSubscribers",
  verbs:        [GET, POST, DELETE],
  initialState: { ...INITIAL_STATE, data: null },
  postFunc:     async (channelName: string, username: string) => {
    const subscriber = await channelAPI.addChannelSubscriber(
      channelName,
      username
    )
    return { channelName, subscriber }
  },
  deleteFunc: async (channelName: string, username: string) => {
    await channelAPI.deleteChannelSubscriber(channelName, username)
    return { channelName, username }
  }
}

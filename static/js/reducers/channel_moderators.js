// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import type { ChannelModerators } from "../flow/discussionTypes"
import * as api from "../lib/api"

type ChannelModeratorsEndpointResponse = {
  channelName: string,
  response: ChannelModerators
}

export const channelModeratorsEndpoint = {
  name:         "channelModerators",
  verbs:        [GET],
  initialState: { ...INITIAL_STATE, data: new Map() },
  getFunc:      async (channelName: string) => {
    const response = await api.getChannelModerators(channelName)
    return { channelName, response }
  },
  getSuccessHandler: (
    { channelName, response }: ChannelModeratorsEndpointResponse,
    data: Map<string, ChannelModerators>
  ): Map<string, ChannelModerators> => {
    const update = new Map(data)
    update.set(channelName, response)
    return update
  }
}

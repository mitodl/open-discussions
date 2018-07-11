// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import type { ChannelContributors } from "../flow/discussionTypes"
import * as api from "../lib/api"

type ChannelContributorsEndpointResponse = {
  channelName: string,
  response: ChannelContributors
}

export const channelContributorsEndpoint = {
  name:         "channelContributors",
  verbs:        [GET],
  initialState: { ...INITIAL_STATE, data: new Map() },
  getFunc:      async (channelName: string) => {
    const response = await api.getChannelContributors(channelName)
    return { channelName, response }
  },
  getSuccessHandler: (
    { channelName, response }: ChannelContributorsEndpointResponse,
    data: Map<string, ChannelContributors>
  ): Map<string, ChannelContributors> => {
    const update = new Map(data)
    update.set(channelName, response)
    return update
  }
}

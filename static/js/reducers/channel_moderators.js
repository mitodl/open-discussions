// @flow
import { GET, POST, DELETE, INITIAL_STATE } from "redux-hammock/constants"

import type { ChannelModerators, Moderator } from "../flow/discussionTypes"

import * as api from "../lib/api"

type ChannelModeratorsEndpointResponse = {
  channelName: string,
  response: ChannelModerators
}

type AddChannelModerator = {
  channelName: string,
  moderator: Moderator
}

type DeleteChannelModerator = {
  channelName: string,
  username: string
}

const addModerator = (
  { channelName, moderator }: AddChannelModerator,
  data: Map<string, ChannelModerators>
): Map<string, ChannelModerators> => {
  const update = new Map(data)
  let moderators = update.get(channelName) || []
  moderators = moderators.filter(
    _moderator => _moderator.moderator_name !== moderator.moderator_name
  )
  update.set(channelName, moderators.concat([moderator]))
  return update
}

const deleteModerator = (
  { channelName, username }: DeleteChannelModerator,
  data: Map<string, ChannelModerators>
): Map<string, ChannelModerators> => {
  const update = new Map(data)
  const moderators = update.get(channelName) || []
  update.set(
    channelName,
    moderators.filter(moderator => moderator.moderator_name !== username)
  )
  return update
}

export const channelModeratorsEndpoint = {
  name:         "channelModerators",
  verbs:        [GET, POST, DELETE],
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
  },
  postFunc: async (channelName: string, username: string) => {
    const moderator = await api.addChannelModerator(channelName, username)
    return { channelName, moderator }
  },
  postSuccessHandler: addModerator,
  deleteFunc:         async (channelName: string, username: string) => {
    await api.deleteChannelModerator(channelName, username)
    return { channelName, username }
  },
  deleteSuccessHandler: deleteModerator
}

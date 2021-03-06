// @flow
import { GET, POST, DELETE, INITIAL_STATE } from "redux-hammock/constants"
import R from "ramda"

import type { ChannelModerators, Moderator } from "../flow/discussionTypes"

import * as moderationAPI from "../lib/api/moderation"

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
  const existingModerator = R.find(
    R.eqProps("moderator_name", moderator),
    moderators
  )
  if (!existingModerator) {
    moderators = moderators.concat([moderator])
    update.set(channelName, moderators)
  }
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
    const response = await moderationAPI.getChannelModerators(channelName)
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
  postFunc: async (channelName: string, email: string) => {
    const moderator = await moderationAPI.addChannelModerator(
      channelName,
      email
    )
    return { channelName, moderator }
  },
  postSuccessHandler: addModerator,
  deleteFunc:         async (channelName: string, username: string) => {
    await moderationAPI.deleteChannelModerator(channelName, username)
    return { channelName, username }
  },
  deleteSuccessHandler: deleteModerator
}

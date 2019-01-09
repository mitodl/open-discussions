// @flow
import { POST, INITIAL_STATE } from "redux-hammock/constants"
import R from "ramda"

import * as channelsAPI from "../lib/api/channels"

import type { ChannelInvitation, ChannelInvites } from "../flow/discussionTypes"

type AddChannelInvite = {
  channelName: string,
  invite: ChannelInvitation
}

const addChannelInvitation = (
  { channelName, invite }: AddChannelInvite,
  data: Map<string, ChannelInvites>
): Map<string, ChannelInvites> => {
  const update = new Map(data)
  let invites = update.get(channelName) || []
  const existingInvite = R.find(R.eqProps("email", invite), invites)
  if (!existingInvite) {
    invites = invites.concat([invite])
    update.set(channelName, invites)
  }
  return update
}

export const channelInvitationsEndpoint = {
  name:         "channelInvitations",
  verbs:        [POST],
  initialState: { ...INITIAL_STATE, data: new Map() },
  postFunc:     async (channelName: string, email: string) => {
    const invite = await channelsAPI.addChannelInvitation(channelName, email)
    return { channelName, invite }
  },
  postSuccessHandler: addChannelInvitation
}

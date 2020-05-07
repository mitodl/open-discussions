// @flow
import { GET, POST, PATCH, INITIAL_STATE } from "redux-hammock/constants"
import R from "ramda"
import { produce } from "immer"

import { SET_CHANNEL_DATA, CLEAR_CHANNEL_ERROR } from "../actions/channel"
import * as channelAPI from "../lib/api/channels"

import type { Channel } from "../flow/discussionTypes"

const updateChannelHandler = (
  payload: Channel,
  data: Map<string, Channel>
): Map<string, Channel> =>
  produce(data, draftState => {
    draftState.set(payload.name, payload)
  })

export const channelsEndpoint = {
  name:                "channels",
  verbs:               [GET, POST, PATCH],
  initialState:        { ...INITIAL_STATE, data: new Map() },
  getFunc:             (name: string) => channelAPI.getChannel(name),
  getSuccessHandler:   updateChannelHandler,
  postFunc:            (channel: Channel) => channelAPI.createChannel(channel),
  postSuccessHandler:  updateChannelHandler,
  patchFunc:           (channel: Channel) => channelAPI.updateChannel(channel),
  patchSuccessHandler: updateChannelHandler,
  extraActions:        {
    [SET_CHANNEL_DATA]: (state: Object, action: Action<*>) =>
      produce(state, draftState => {
        action.payload.forEach(channel => {
          draftState.data.set(channel.name, channel)
        })
      }),
    [CLEAR_CHANNEL_ERROR]: R.dissoc("error")
  }
}

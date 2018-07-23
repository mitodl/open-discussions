// @flow
import { PATCH, INITIAL_STATE } from "redux-hammock/constants"
import * as api from "../lib/api"

export const channelAvatarEndpoint = {
  name:         "channelAvatar",
  verbs:        [PATCH],
  initialState: { ...INITIAL_STATE },
  patchFunc:    (channelName: string, blob: Blob, name: string) =>
    api.patchChannelAvatar(channelName, blob, name)
}

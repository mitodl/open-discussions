// @flow
import { PATCH, INITIAL_STATE } from "redux-hammock/constants"
import * as api from "../lib/api/api"

export const channelBannerEndpoint = {
  name:         "channelBanner",
  verbs:        [PATCH],
  initialState: { ...INITIAL_STATE },
  patchFunc:    (channelName: string, blob: Blob, name: string) =>
    api.patchChannelBanner(channelName, blob, name)
}

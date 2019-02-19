// @flow
import * as livestreamAPI from "../lib/api/livestream"
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import type { LiveStreamResponse } from "../lib/api/livestream"

export const livestreamEndpoint = {
  name:         "livestream",
  verbs:        [GET],
  getFunc:      () => livestreamAPI.getLivestreamEvents(),
  initialState: {
    ...INITIAL_STATE,
    data: []
  },
  getSuccessHandler: (response: LiveStreamResponse) => {
    const { data } = response
    return data
  }
}

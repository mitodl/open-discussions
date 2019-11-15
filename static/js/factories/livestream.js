// @flow
import casual from "casual-browserify"

import type { LiveStreamEvent } from "../flow/livestreamTypes"

export const makeLivestreamEvent = (
  isLive: boolean = false
): LiveStreamEvent => ({
  ownerAccountId: casual.integer(1, 1000),
  id:             casual.integer(1, 1000),
  isLive
})

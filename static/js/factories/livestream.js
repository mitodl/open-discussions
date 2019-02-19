// @flow
import casual from "casual-browserify"

import type { LiveStreamEvent } from "../flow/livestreamTypes"

export const makeLivestreamEvent = (
  isLive: boolean = false
): LiveStreamEvent => ({
  ownerAccountId: casual.number,
  id:             casual.number,
  isLive
})

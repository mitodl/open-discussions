// @flow
import { createAction } from "redux-actions"

export const EVICT_POSTS_FOR_CHANNEL = "EVICT_POSTS_FOR_CHANNEL"
export const evictPostsForChannel = createAction<string, *>(
  EVICT_POSTS_FOR_CHANNEL
)

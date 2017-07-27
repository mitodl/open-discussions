//@flow

import type { Channel } from "../flow/discussionTypes"

export const CHANNEL_TYPE_PUBLIC = "public"
export const CHANNEL_TYPE_PRIVATE = "private"

export const newChannel = (): Channel => ({
  name:               "",
  title:              "",
  public_description: "",
  channel_type:       CHANNEL_TYPE_PUBLIC
})

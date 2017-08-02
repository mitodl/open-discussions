//@flow

import type { ChannelEditable } from "../flow/discussionTypes"

export const CHANNEL_TYPE_PUBLIC = "public"
export const CHANNEL_TYPE_PRIVATE = "private"

export const newChannel = (): ChannelEditable => ({
  name:               "",
  title:              "",
  public_description: "",
  channel_type:       CHANNEL_TYPE_PUBLIC
})

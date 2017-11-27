//@flow
import R from "ramda"

import type { ChannelForm, ChannelModerators } from "../flow/discussionTypes"

export const CHANNEL_TYPE_PUBLIC = "public"
export const CHANNEL_TYPE_PRIVATE = "private"

export const newChannelForm = (): ChannelForm => ({
  name:               "",
  title:              "",
  public_description: "",
  channel_type:       CHANNEL_TYPE_PUBLIC
})

export const isModerator = (
  moderators: ChannelModerators,
  username: string
): boolean => R.any(R.propEq("moderator_name", username), moderators)

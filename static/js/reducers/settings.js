// @flow
import * as api from "../lib/api"
import { GET, PATCH } from "redux-hammock/constants"

export const FREQUENCY_IMMEDIATE: "immediate" = "immediate"
export const FREQUENCY_DAILY: "daily" = "daily"
export const FREQUENCY_WEEKLY: "weekly" = "weekly"
export const FREQUENCY_NEVER: "never" = "never"

export const FRONTPAGE_NOTIFICATION = "frontpage"
export const COMMENT_NOTIFICATION = "comments"

export const FRONTPAGE_FREQUENCY_CHOICES = [
  { value: FREQUENCY_NEVER, label: "Never" },
  { value: FREQUENCY_DAILY, label: "Daily" },
  { value: FREQUENCY_WEEKLY, label: "Weekly" }
]

export type FrontpageFrequency =
  | typeof FREQUENCY_NEVER
  | typeof FREQUENCY_DAILY
  | typeof FREQUENCY_WEEKLY

export type CommentFrequency =
  | typeof FREQUENCY_NEVER
  | typeof FREQUENCY_IMMEDIATE

export const settingsEndpoint = {
  name:      "settings",
  verbs:     [GET, PATCH],
  getFunc:   (token: ?string) => api.getSettings(token),
  patchFunc: async (object: Object, token: ?string) => {
    await api.patchFrontpageSetting(
      {
        notification_type: FRONTPAGE_NOTIFICATION,
        trigger_frequency: object[FRONTPAGE_NOTIFICATION]
      },
      token
    )
    await api.patchCommentSetting(
      {
        notification_type: COMMENT_NOTIFICATION,
        trigger_frequency: object[COMMENT_NOTIFICATION]
      },
      token
    )
  }
}

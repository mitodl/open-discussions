// @flow
import * as api from "../lib/api"
import { GET, PATCH } from "redux-hammock/constants"

import type { NotificationSetting } from "../flow/settingsTypes"

export const FREQUENCY_IMMEDIATE = "immediate"
export const FREQUENCY_DAILY = "daily"
export const FREQUENCY_WEEKLY = "weekly"
export const FREQUENCY_NEVER = "never"

export const FRONTPAGE_NOTIFICATION = "frontpage"
export const COMMENT_NOTIFICATION = "comments"

export const FRONTPAGE_FREQUENCY_CHOICES = [
  { value: FREQUENCY_NEVER, label: "Never" },
  { value: FREQUENCY_DAILY, label: "Daily" },
  { value: FREQUENCY_WEEKLY, label: "Weekly" }
]

export const settingsEndpoint = {
  name:      "settings",
  verbs:     [GET, PATCH],
  getFunc:   (token: ?string) => api.getSettings(token),
  patchFunc: (object: NotificationSetting, token: ?string) =>
    api.patchFrontpageSetting(object, token)
}

// @flow
import R from "ramda"

import {
  FRONTPAGE_NOTIFICATION,
  COMMENT_NOTIFICATION,
  FRONTPAGE_FREQUENCY_CHOICES
} from "../reducers/settings"
import { draw } from "./util"

import type { NotificationSetting } from "../flow/settingsTypes"

export const makeFrontpageSetting = (): NotificationSetting => ({
  notification_type: FRONTPAGE_NOTIFICATION,
  trigger_frequency: draw(R.pluck("value", FRONTPAGE_FREQUENCY_CHOICES))
})

export const makeCommentSetting = (): NotificationSetting => ({
  notification_type: COMMENT_NOTIFICATION,
  trigger_frequency: draw(R.pluck("value", FRONTPAGE_FREQUENCY_CHOICES))
})

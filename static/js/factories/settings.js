// @flow
import R from "ramda"

import {
  FRONTPAGE_NOTIFICATION,
  FRONTPAGE_FREQUENCY_CHOICES
} from "../reducers/settings"
import { draw } from "./util"

import type { NotificationSetting } from "../flow/settingsTypes"

export const makeNotificationSetting = (): NotificationSetting => ({
  notification_type: FRONTPAGE_NOTIFICATION,
  trigger_frequency: draw(R.pluck("value", FRONTPAGE_FREQUENCY_CHOICES))
})

// @flow
import { assert } from "chai"
import R from "ramda"

import {
  FRONTPAGE_NOTIFICATION,
  FRONTPAGE_FREQUENCY_CHOICES
} from "../reducers/settings"
import { makeNotificationSetting } from "./settings"

describe("settings factory", () => {
  it("should make a setting object", () => {
    const setting = makeNotificationSetting()
    assert.equal(setting.notification_type, FRONTPAGE_NOTIFICATION)
    assert.include(
      R.pluck("value", FRONTPAGE_FREQUENCY_CHOICES),
      setting.trigger_frequency
    )
  })
})

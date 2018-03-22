// @flow
import { assert } from "chai"
import R from "ramda"

import {
  FRONTPAGE_NOTIFICATION,
  COMMENT_NOTIFICATION,
  FRONTPAGE_FREQUENCY_CHOICES
} from "../reducers/settings"
import { makeFrontpageSetting, makeCommentSetting } from "./settings"

describe("settings factory", () => {
  it("should make a frontpage setting object", () => {
    const setting = makeFrontpageSetting()
    assert.equal(setting.notification_type, FRONTPAGE_NOTIFICATION)
    assert.include(
      R.pluck("value", FRONTPAGE_FREQUENCY_CHOICES),
      setting.trigger_frequency
    )
  })

  it("should make a comment setting object", () => {
    const setting = makeCommentSetting()
    assert.equal(setting.notification_type, COMMENT_NOTIFICATION)
    assert.include(
      R.pluck("value", FRONTPAGE_FREQUENCY_CHOICES),
      setting.trigger_frequency
    )
  })
})

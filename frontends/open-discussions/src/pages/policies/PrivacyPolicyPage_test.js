// @flow
/* global SETTINGS: false */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import PrivacyPolicyPage from "./PrivacyPolicyPage"

describe("PrivacyPolicyPage", () => {
  it("uses the support email", () => {
    const wrapper = shallow(<PrivacyPolicyPage />)
    const inner = wrapper
      .at(0)
      .shallow()
      .find("PrivacyPolicyPage")
      .shallow()
      .find("Card")
      .shallow()
    assert.equal(
      inner.find("a").props().href,
      `mailto:${SETTINGS.support_email}`
    )
  })
})

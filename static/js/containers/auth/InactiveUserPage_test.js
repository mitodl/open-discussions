// @flow
/* global SETTINGS: false */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import InactiveUserPage from "./InactiveUserPage"

describe("InactiveUserPage", () => {
  it("uses the support email", () => {
    const wrapper = shallow(<InactiveUserPage />)
    assert.equal(
      wrapper.find("a").props().href,
      `mailto:${SETTINGS.support_email}`
    )
  })
})

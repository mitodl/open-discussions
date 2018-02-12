// @flow
/* global SETTINGS: false */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import AuthRequiredPage from "./AuthRequiredPage"

describe("AuthRequiredPage", () => {
  it("uses the external login url", () => {
    const wrapper = shallow(<AuthRequiredPage />)
    assert.equal(
      wrapper.find("a").props().href,
      SETTINGS.authenticated_site.login_url
    )
  })
})

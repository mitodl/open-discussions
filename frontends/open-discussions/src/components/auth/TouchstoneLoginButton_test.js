// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import TouchstoneLoginButton from "./TouchstoneLoginButton"
import { TOUCHSTONE_URL } from "../../lib/url"

describe("TouchstoneLoginButton", () => {
  it("renders a touchstone url", () => {
    const wrapper = shallow(<TouchstoneLoginButton />)
    const link = wrapper.find("a")
    assert.isTrue(link.exists())
    assert.equal(link.prop("href"), TOUCHSTONE_URL)
  })

  it("renders a touchstone url with a next param", () => {
    const wrapper = shallow(<TouchstoneLoginButton next="/abc/123" />)
    const link = wrapper.find("a")
    assert.isTrue(link.exists())
    assert.equal(link.prop("href"), `${TOUCHSTONE_URL}&next=/abc/123`)
  })
})

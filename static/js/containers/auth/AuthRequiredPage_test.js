// @flow
/* global SETTINGS: false */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import AuthRequiredPage from "./AuthRequiredPage"
import { MICROMASTERS_URL } from "../../lib/url"

describe("AuthRequiredPage", () => {
  it("uses the micromasters login url with next param", () => {
    const wrapper = shallow(<AuthRequiredPage location={{ search: "" }} />)
    assert.equal(
      wrapper.find("a").props().href,
      `${MICROMASTERS_URL}?next=${encodeURIComponent("/")}`
    )
  })

  it("uses the micromasters login url with a next param", () => {
    const next = encodeURIComponent("/secret/url")
    const search = `?next=${next}&ignore=me`
    const wrapper = shallow(<AuthRequiredPage location={{ search }} />)
    assert.equal(
      wrapper.find("a").props().href,
      `${MICROMASTERS_URL}?next=${next}`
    )
  })
})

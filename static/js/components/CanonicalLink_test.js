// @flow
/* global SETTINGS: false */
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import CanonicalLink from "./CanonicalLink"
import { makeMatch } from "../factories/util"

const baseURL = "https://fake.url/"
const partialUrl = "fake/url/stub"
const fullUrl = `${baseURL}${partialUrl}`

describe("CanonicalLink", () => {
  [
    [partialUrl, null, fullUrl, "relative URL"],
    [null, makeMatch(partialUrl), fullUrl, "react-router Match object"],
    [
      partialUrl,
      makeMatch("different/url/stub"),
      fullUrl,
      "relative URL and Match object"
    ]
  ].forEach(([relativeUrlProp, matchProp, expectedLinkHref, desc]) => {
    it(`renders a <link> tag with the right href when given a ${desc}`, () => {
      SETTINGS.public_path = baseURL
      const wrapper = shallow(
        <CanonicalLink relativeUrl={relativeUrlProp} match={matchProp} />
      )
      const link = wrapper.find("link")
      assert.isTrue(link.exists())
      assert.equal(link.prop("href"), expectedLinkHref)
    })
  })

  it("renders nothing when neither a relative URL or a Match object are provided", () => {
    const wrapper = shallow(<CanonicalLink />)
    assert.isFalse(wrapper.find("link").exists())
  })

  it("removes a trailing slash from the link's href value", () => {
    SETTINGS.public_path = baseURL
    const wrapper = shallow(<CanonicalLink relativeUrl="url/with/slash/" />)
    const link = wrapper.find("link")
    assert.isTrue(link.exists())
    assert.equal(link.prop("href"), `${baseURL}url/with/slash`)
  })
})

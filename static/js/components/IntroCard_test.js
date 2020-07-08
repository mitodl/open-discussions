// @flow
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import IntroCard from "./IntroCard"

import { REGISTER_URL, newPostURL } from "../lib/url"
import * as utilLib from "../lib/util"

describe("IntroCard", () => {
  const render = () => shallow(<IntroCard />)

  let isAnonStub

  beforeEach(() => {
    isAnonStub = sinon.stub(utilLib, "userIsAnonymous")
  })

  afterEach(() => {
    isAnonStub.restore()
  })

  //
  ;[
    [true, REGISTER_URL, "Become a member"],
    [false, newPostURL(), "Create a post"]
  ].forEach(([isAnon, url, text]) => {
    it(`should return the right stuff when anon == ${String(isAnon)}`, () => {
      isAnonStub.returns(isAnon)
      const link = render().find(".link-button")
      assert.equal(link.prop("to"), url)
      assert.equal(link.text(), text)
    })
  })
})

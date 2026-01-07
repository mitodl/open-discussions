// @flow
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import IntroCard from "./IntroCard"

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
  it(`should not return a link when anon == true`, () => {
    isAnonStub.returns(true)
    const link = render().find(".link-button")
    assert.equal(link.length, 0)
    const text = render().find("Become a member")
    assert.equal(text.length, 0)
  })
})

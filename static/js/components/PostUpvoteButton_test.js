// @flow
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import LoginPopup from "../components/LoginPopup"
import PostUpvoteButton from "./PostUpvoteButton"

import { makePost } from "../factories/posts"
import * as utilFuncs from "../lib/util"
import { shouldIf } from "../lib/test_utils"

describe("PostUpvoteButton", () => {
  let sandbox

  const renderButtons = () => shallow(<PostUpvoteButton post={makePost()} />)

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  //
  ;[true, false].forEach(isAnonymous => {
    it(`${shouldIf(
      isAnonymous
    )} include login popup is userIsAnonymous == ${String(
      isAnonymous
    )}`, () => {
      sandbox.stub(utilFuncs, "userIsAnonymous").returns(isAnonymous)
      const popup = renderButtons().find(LoginPopup)
      assert.equal(popup.exists(), isAnonymous)
    })
  })
})

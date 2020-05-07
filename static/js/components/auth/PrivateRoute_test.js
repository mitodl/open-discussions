// @flow
/* global SETTINGS:false */
import React from "react"
import sinon from "sinon"
import { shallow } from "enzyme"
import { assert } from "chai"
import { Redirect } from "react-router-dom"

import PrivateRoute from "./PrivateRoute"
import * as util from "../../lib/util"
import { isIf } from "../../lib/test_utils"
import * as authHelpers from "../../lib/auth"

describe("PrivateRoute", () => {
  const fakePath = "somepath",
    fakeRedirectUrl = "/login"
  let sandbox, userIsAnonymousStub, loginRedirectUrlStub, FakeComponent

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    userIsAnonymousStub = sandbox.stub(util, "userIsAnonymous")
    loginRedirectUrlStub = sandbox
      .stub(authHelpers, "generateLoginRedirectUrl")
      .returns(fakeRedirectUrl)
    FakeComponent = sandbox.fake()
  })

  afterEach(() => {
    sandbox.restore()
  })
  ;[
    [false, "load the route"],
    [true, "redirect to the login page"]
  ].forEach(([isAnonymous, desc]) => {
    it(`should ${desc} if user ${isIf(isAnonymous)} anonymous`, () => {
      userIsAnonymousStub.returns(isAnonymous)
      const wrapper = shallow(
        <PrivateRoute path={fakePath} component={FakeComponent} />
      )
      const routeComponent = wrapper.find("Route")
      assert.isTrue(routeComponent.exists())
      const { path, render } = routeComponent.props()
      assert.equal(path, fakePath)
      const renderResult = render()
      if (isAnonymous) {
        assert.equal(renderResult.type, Redirect)
        assert.equal(renderResult.props.to, fakeRedirectUrl)
        sinon.assert.calledOnce(loginRedirectUrlStub)
      } else {
        assert.equal(renderResult.type, FakeComponent)
      }
    })
  })
})

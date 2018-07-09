// @flow
/* global SETTINGS: false */
import React from "react"
import sinon from "sinon"
import { assert } from "chai"
import { shallow } from "enzyme"

import Toolbar from "./Toolbar"

describe("Toolbar", () => {
  let toggleShowDrawerStub, sandbox

  const renderToolbar = () =>
    shallow(
      <Toolbar
        toggleShowDrawer={toggleShowDrawerStub}
        toggleShowUserMenu={sandbox.stub()}
        showUserMenu={false}
      />,
      { disableLifecycleMethods: true }
    )

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    toggleShowDrawerStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should call toggleShowDrawer when menu button is clicked", () => {
    renderToolbar()
      .find("a")
      .at(0)
      .simulate("click", {
        preventDefault: sandbox.stub()
      })
    assert.ok(toggleShowDrawerStub.called)
  })

  //
  ;[true, false].forEach(isLoggedIn => {
    it(`should ${isLoggedIn ? "" : "not"} display UserMenu if user is logged ${
      isLoggedIn ? "in" : "out"
    }`, () => {
      SETTINGS.username = isLoggedIn ? "username" : null
      assert.equal(
        renderToolbar()
          .find("UserMenu")
          .exists(),
        isLoggedIn
      )
    })
  })
})

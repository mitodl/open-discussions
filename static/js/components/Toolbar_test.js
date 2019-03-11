// @flow
/* global SETTINGS: false */
import React from "react"
import sinon from "sinon"
import { assert } from "chai"
import { shallow } from "enzyme"

import Toolbar from "./Toolbar"

import { makeProfile } from "../factories/profiles"

describe("Toolbar", () => {
  let toggleShowDrawerStub, sandbox

  const renderToolbar = () =>
    shallow(
      <Toolbar
        toggleShowDrawer={toggleShowDrawerStub}
        toggleShowUserMenu={sandbox.stub()}
        showUserMenu={false}
        profile={makeProfile()}
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

  it("should pass toggleShowDrawer to menu component", () => {
    renderToolbar()
      .find("HamburgerAndLogo")
      .props()
      .onHamburgerClick({
        preventDefault: sandbox.stub()
      })
    assert.ok(toggleShowDrawerStub.called)
  })

  it("should include UserMenu", () => {
    assert.isTrue(
      renderToolbar()
        .find("UserMenu")
        .exists()
    )
  })

  //
  ;[true, false].forEach(allowSearch => {
    it(`${allowSearch ? "has" : "doesn't have"} as search icon`, () => {
      SETTINGS.allow_search = allowSearch
      const wrapper = renderToolbar()
      assert.equal(wrapper.find(".search-link").length, allowSearch ? 1 : 0)
    })
  })
})

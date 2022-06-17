// @flow
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

  it("has a search icon", () => {
    const wrapper = renderToolbar()
    assert.equal(wrapper.find(".search-link").length, 1)
  })
})

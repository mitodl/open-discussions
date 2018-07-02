// @flow
import React from "react"
import sinon from "sinon"
import { assert } from "chai"
import { shallow } from "enzyme"

import { _DropdownMenu } from "./DropdownMenu"

describe("dropdown menu", () => {
  let sandbox, closeMenu

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    closeMenu = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  // I'm using the _DropdownMenu for testing because the
  // onClickOutside HOC doesn't play well with shallow rendering
  const renderDropdownHelper = children =>
    shallow(
      <_DropdownMenu closeMenu={closeMenu}>{children || <div />}</_DropdownMenu>
    )

  it("should have a handleClickOutside handler", () => {
    assert.isFunction(renderDropdownHelper().instance().handleClickOutside)
  })

  it("should set click handlers on the children", () => {
    const wrapper = renderDropdownHelper([
      <div key="1">first</div>,
      <div key="2">second</div>
    ])
    wrapper.find("div").forEach(div => {
      assert.equal(closeMenu, div.props().onClick)
    })
  })

  it("should have a ul with the right class!", () => {
    const wrapper = renderDropdownHelper().find("ul")
    assert.ok(wrapper.exists())
    const { className } = wrapper.props()
    assert.equal(className, "dropdown-menu")
  })
})

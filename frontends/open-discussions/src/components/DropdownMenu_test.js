// @flow
import React from "react"
import sinon from "sinon"
import { assert } from "chai"

import { _DropdownMenu } from "./DropdownMenu"

import { configureShallowRenderer } from "../lib/test_utils"

describe("dropdown menu", () => {
  let sandbox, closeMenu, renderDropdownHelper

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    closeMenu = sandbox.stub()

    // I'm using the _DropdownMenu for testing because the
    // onClickOutside HOC doesn't play well with shallow rendering
    renderDropdownHelper = configureShallowRenderer(_DropdownMenu, {
      closeMenu
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should have a handleClickOutside handler", () => {
    assert.isFunction(renderDropdownHelper().instance().handleClickOutside)
  })

  it("should set click handlers on the children", () => {
    const wrapper = renderDropdownHelper({
      children: [<div key="1">first</div>, <div key="2">second</div>]
    })
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

  it("should put a className if given one", () => {
    const wrapper = renderDropdownHelper({ className: "wow" })
    assert.ok(wrapper.find(".dropdown-menu.wow"))
  })
})

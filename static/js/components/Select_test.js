// @flow
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme/build"

import Select from "./Select"

describe("Select", function() {
  let sandbox,
    options,
    isMulti,
    closeMenuOnSelect,
    openMenuOnClick,
    placeholder,
    menuPlacement,
    className,
    field,
    form

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    closeMenuOnSelect = false
    openMenuOnClick = false
    isMulti = false
    placeholder = "Select something..."
    menuPlacement = "bottom"
    className = "class"
    field = { name: "TestName" }
    ;(form = {}),
    (options = [
      [{ value: 1, label: "Option A" }, { value: 2, label: "Option B" }]
    ])
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) => {
    return shallow(
      <Select
        options={options}
        closeMenuOnSelect={closeMenuOnSelect}
        openMenuOnClick={openMenuOnClick}
        isMulti={isMulti}
        placeholder={placeholder}
        menuPlacement={menuPlacement}
        className={className}
        field={field}
        form={form}
        {...props}
      />
    )
  }

  it("passes props to the inner ReactSelect component", () => {
    const props = render().props()
    assert.equal(props.name, field.name)
    assert.equal(props.options, options)
    assert.equal(props.isMulti, isMulti)
    assert.equal(props.closeMenuOnSelect, closeMenuOnSelect)
    assert.equal(props.openMenuOnClick, openMenuOnClick)
    assert.equal(props.menuPlacement, menuPlacement)
    assert.equal(props.className, className)
  })
})

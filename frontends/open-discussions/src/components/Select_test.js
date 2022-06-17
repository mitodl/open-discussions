// @flow
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { mount } from "enzyme/build"

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
    form,
    setFieldValueStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    setFieldValueStub = sandbox.stub()
    closeMenuOnSelect = false
    openMenuOnClick = false
    isMulti = false
    placeholder = "Select something..."
    menuPlacement = "bottom"
    className = "class"
    form = {
      setFieldValue: setFieldValueStub
    }
    options = [
      { value: 1, label: "Option A" },
      { value: 2, label: "Option B" }
    ]
    field = { name: "TestName", value: [options[0].value] }
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) => {
    return mount(
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
    const props = render()
      .find("Select")
      .at(0)
      .props()
    assert.equal(props.options, options)
    assert.equal(props.isMulti, isMulti)
    assert.equal(props.closeMenuOnSelect, closeMenuOnSelect)
    assert.equal(props.openMenuOnClick, openMenuOnClick)
    assert.equal(props.menuPlacement, menuPlacement)
    assert.equal(props.className, className)
  })

  //
  ;[
    [true, null, [null]],
    [true, 23, [23]],
    [false, null, null],
    [false, 24, 24]
  ].forEach(([isMulti, value, expected]) => {
    [true, false].forEach(hasOptions => {
      it(`sets field value to ${String(
        expected
      )} when isMulti=${isMulti.toString()} or null/[] when option is null`, () => {
        field = {
          name:  "TestName",
          value: isMulti ? [options[0].value] : options[0].value
        }
        const selectOptions = hasOptions ? options : null
        const wrapper = render({ isMulti, field, options: selectOptions })
        const selector = wrapper.find("Select").at(1)
        if (hasOptions) {
          selector.instance().onChange(isMulti ? [{ value }] : { value })
          sinon.assert.calledWith(setFieldValueStub, field.name, expected)
        } else {
          selector.instance().onChange(isMulti ? [] : null)
          sinon.assert.calledWith(
            setFieldValueStub,
            field.name,
            isMulti ? [] : null
          )
        }
      })
    })
  })
})

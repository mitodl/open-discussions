import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import R from "ramda"
import sinon from "sinon"

import PostSortPicker from "./PostSortPicker"

import { VALID_SORT_LABELS } from "../lib/sorting"

describe("PostSortPicker", () => {
  const renderPicker = (props = {}) => shallow(<PostSortPicker {...props} />)

  it("should have all the options we expect", () => {
    const wrapper = renderPicker()
    R.zip(
      [...wrapper.find("option")],
      VALID_SORT_LABELS
    ).forEach(([optionWrapper, [postSortType, postSortLabel]]) => {
      const props = optionWrapper.props
      assert.equal(props.label, postSortLabel)
      assert.equal(props.value, postSortType)
      assert.equal(props.children, postSortLabel)
      assert.equal(optionWrapper.key, postSortType)
    })
  })

  it("should do what we want with the props we pass in", () => {
    const updateSortStub = sinon.stub()
    const wrapper = renderPicker({
      updateSortParam: updateSortStub,
      value:           "a great value"
    })
    assert.equal(wrapper.find("select").props().value, "a great value")
    wrapper.find("select").props().onChange()
    assert(updateSortStub.called)
  })
})

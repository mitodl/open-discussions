// @flow
import React from "react"
import sinon from "sinon"
import _ from "lodash"
import { assert } from "chai"
import { shallow } from "enzyme"

import SearchFilter from "./SearchFilter"

describe("SearchFilter", () => {
  let onClickStub

  const renderSearchFilter = props =>
    shallow(<SearchFilter clearFacet={onClickStub} {...props} />)

  beforeEach(() => {
    onClickStub = sinon.stub()
  })

  it("should render a search filter correctly", () => {
    const title = "Availability"
    const value = "Upcoming"
    const wrapper = renderSearchFilter({
      title,
      value,
      labelFunction: _.upperCase
    })
    const label = wrapper.text()
    assert.isTrue(label.includes(_.upperCase(value)))
    assert.isTrue(label.includes(title))
  })

  it("should trigger clearFacet function on click", async () => {
    const wrapper = renderSearchFilter({ title: "Platform", value: "ocw" })
    wrapper.find(".remove-filter").simulate("click")
    sinon.assert.calledOnce(onClickStub)
  })
})

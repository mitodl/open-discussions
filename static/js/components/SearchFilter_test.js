// @flow
import React from "react"
import _ from "lodash"
import { assert } from "chai"
import { shallow } from "enzyme"
import * as sinon from "sinon"

import SearchFilter from "./SearchFilter"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("SearchFilter", () => {
  let helper, onClickStub

  const renderSearchFilter = props => {
    return shallow(<SearchFilter clearFacet={onClickStub} {...props} />)
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    onClickStub = helper.sandbox.stub()
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render a search filter correctly", () => {
    const title = "Availability"
    const value = "Upcoming"
    const wrapper = renderSearchFilter({
      title,
      value,
      labelFunction: _.upperCase
    })
    const label = wrapper
      .find(".search-filter-div")
      .at(0)
      .text()
    assert.isTrue(label.includes(_.upperCase(value)))
    assert.isTrue(label.includes(title))
  })

  it("should trigger clearFacet function on click", async () => {
    const wrapper = renderSearchFilter({ title: "Platform", value: "ocw" })
    wrapper.find(".search-filter-close").simulate("click")
    sinon.assert.calledOnce(onClickStub)
  })
})

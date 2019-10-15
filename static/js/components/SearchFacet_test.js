// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import * as sinon from "sinon"
import R from "ramda"

import SearchFacet from "./SearchFacet"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeSearchFacetResult } from "../factories/search"
import { shouldIf } from "../lib/test_utils"

describe("SearchFacet", () => {
  let helper, onUpdateStub, results, facet
  const name = "topics"
  const title = "Search Topics"

  const renderSearchFacet = props =>
    mount(
      <SearchFacet
        name={name}
        title={title}
        // $FlowFixMe: test results are fine
        results={results}
        currentlySelected={[]}
        onUpdate={onUpdateStub}
        {...props}
      />
    )

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    onUpdateStub = helper.sandbox.stub()
    results = new Map(Object.entries(makeSearchFacetResult())).get("topics")
    // $FlowFixMe: buckets not missing here
    facet = results.buckets[0]
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render facets correctly", () => {
    const wrapper = renderSearchFacet()
    const checkbox = wrapper.find("input").at(0)
    assert.include(wrapper.find(".filter-section-title").text(), title)
    assert.equal(checkbox.prop("name"), name)
    assert.equal(checkbox.prop("value"), facet["key"])
  })

  it("checkbox should call onUpdate when clicked", () => {
    const wrapper = renderSearchFacet()
    const event = { target: { checked: true, name: name, value: facet["key"] } }
    wrapper
      .find("input")
      .at(0)
      .prop("onChange")(event)
    sinon.assert.calledWith(onUpdateStub, event)
  })

  it("whole thing should call onUpdate when clicked", () => {
    renderSearchFacet()
      .find(".facet-visible")
      .at(0)
      .simulate("click")
    sinon.assert.calledWith(onUpdateStub, {
      target: { checked: true, name: name, value: facet["key"] }
    })
  })

  it("checkbox should call the label function if assigned", () => {
    const labelStub = helper.sandbox.stub()
    renderSearchFacet({ labelFunction: labelStub })
    sinon.assert.calledWith(labelStub, facet["key"])
  })

  //
  ;[[2, false], [20, true]].forEach(([numBuckets, shouldShowExpansionUI]) => {
    it(`${shouldIf(shouldShowExpansionUI)} show hide/show button when ${String(
      numBuckets
    )} buckets`, () => {
      // $FlowFixMe: who cares it's a test
      results.buckets = R.times(
        () => ({ key: "Physics", doc_count: 32 }),
        numBuckets
      )

      const wrapper = renderSearchFacet()
      if (shouldShowExpansionUI) {
        assert.equal(wrapper.find(".facet-more-less").text(), "View more")
        wrapper.find(".facet-more-less").simulate("click")
        assert.equal(wrapper.find(".facet-more-less").text(), "View less")
      } else {
        assert.isNotOk(wrapper.find(".facet-more-less").exists())
      }
    })
  })

  it("should have a button to show / hide the facet list", () => {
    const wrapper = renderSearchFacet()
    assert.ok(wrapper.find(".facet-visible").exists())
    wrapper.find(".filter-section-title").simulate("click")
    assert.isNotOk(wrapper.find(".facet-visible").exists())
  })

  //
  ;[true, false].forEach((isSelected: boolean) => {
    it(`checkbox ${shouldIf(isSelected)} be checked`, () => {
      const currentlySelected = isSelected ? [facet["key"]] : []
      const wrapper = renderSearchFacet({ currentlySelected })
      assert.equal(
        wrapper
          .find("input")
          .at(0)
          .prop("checked"),
        isSelected
      )
    })
  })
})

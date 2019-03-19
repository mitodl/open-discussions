// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import * as sinon from "sinon"

import { SearchFacet } from "./SearchFacet"
import { HIDE_SEARCH_FACETS, SHOW_SEARCH_FACETS } from "../actions/ui"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeSearchFacetResult } from "../factories/search"
import { shouldIf } from "../lib/test_utils"

describe("SearchFacet", () => {
  let helper, onUpdateStub, dispatchStub, results, facet
  const name = "topics"
  const title = "Search Topics"

  const renderSearchFacet = props => {
    return shallow(
      <SearchFacet
        name={name}
        title={title}
        onUpdate={onUpdateStub}
        dispatch={dispatchStub}
        // $FlowFixMe: test results are fine
        results={results}
        currentlySelected={[]}
        showAll={false}
        {...props}
      />
    )
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    onUpdateStub = helper.sandbox.stub()
    dispatchStub = helper.sandbox.stub().returns({ type: "action" })
    results = new Map(Object.entries(makeSearchFacetResult())).get("topics")
    // $FlowFixMe: buckets not missing here
    facet = results.buckets[0]
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render facets correctly", () => {
    const wrapper = renderSearchFacet()
    const checkbox = wrapper.find("Checkbox").at(0)
    assert.equal(wrapper.find(".facet-title").text(), title)
    assert.equal(checkbox.prop("name"), name)
    assert.equal(checkbox.prop("value"), facet["key"])
  })

  it("checkbox should call onUpdate when clicked", () => {
    const wrapper = renderSearchFacet()
    const event = { target: { checked: true, name: name, value: facet["key"] } }
    wrapper
      .find("Checkbox")
      .at(0)
      .simulate("click", event)
    sinon.assert.calledWith(onUpdateStub, event)
  })

  it("checkbox should call the label function if assigned", () => {
    const labelStub = helper.sandbox.stub()
    renderSearchFacet({ labelFunction: labelStub })
    sinon.assert.calledWith(labelStub, facet["key"])
  })

  it("should show 'View more' if # facets > specified max", () => {
    const wrapper = renderSearchFacet({ displayCount: 1 })
    wrapper.find(".facet-more-less").simulate("click")
    sinon.assert.calledWith(dispatchStub, {
      payload: name,
      type:    SHOW_SEARCH_FACETS
    })
  })

  it("should show 'View less' if # facets > specified max and showAll is true", () => {
    const wrapper = renderSearchFacet({ displayCount: 1, showAll: true })
    wrapper.find(".facet-more-less").simulate("click")
    sinon.assert.calledWith(dispatchStub, {
      payload: name,
      type:    HIDE_SEARCH_FACETS
    })
  })

  //
  ;[true, false].forEach((isSelected: boolean) => {
    it(`checkbox ${shouldIf(isSelected)} be checked`, () => {
      const currentlySelected = isSelected ? [facet["key"]] : []
      const wrapper = renderSearchFacet({ currentlySelected })
      assert.equal(
        wrapper
          .find("Checkbox")
          .at(0)
          .prop("checked"),
        isSelected
      )
    })
  })

  //
  ;[
    [true, false, false],
    [false, true, false],
    [false, false, true],
    [false, false, false]
  ].forEach(([newResults, newSelected, newShow]) => {
    it(`component ${shouldIf(
      newResults || newSelected || newShow
    )} update when ${
      newResults
        ? "facets"
        : newSelected
          ? "selected facets"
          : newShow
            ? "showAll toggle"
            : "nothing"
    } changed`, () => {
      const instance = renderSearchFacet().instance()
      const nextSelected = newSelected
        ? ["fakeSelection"]
        : instance.props.currentlySelected
      const nextResults = newResults ? { buckets: [] } : instance.props.results
      const nextShowAll = newShow
        ? !instance.props.showAll
        : instance.props.showAll
      assert.equal(
        instance.shouldComponentUpdate({
          showAll:           nextShowAll,
          currentlySelected: nextSelected,
          results:           nextResults
        }),
        newShow || newSelected || newResults
      )
    })
  })
})

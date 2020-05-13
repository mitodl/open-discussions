// @flow
import { assert } from "chai"
import * as sinon from "sinon"

import FilterableSearchFacet from "./FilterableSearchFacet"

import IntegrationTestHelper from "../../util/integration_test_helper"
import { makeSearchFacetResult } from "../../factories/search"
import { shouldIf, makeEvent } from "../../lib/test_utils"

describe("FilterableSearchFacet", () => {
  let helper, onUpdateStub, results, facet, render
  const name = "topics"
  const title = "Search Topics"

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    onUpdateStub = helper.sandbox.stub()
    results = new Map(Object.entries(makeSearchFacetResult())).get("topics")
    // $FlowFixMe: buckets not missing here
    facet = results.buckets[0]
    render = helper.configureReduxQueryRenderer(FilterableSearchFacet, {
      name,
      title,
      results,
      currentlySelected: [],
      onUpdate:          onUpdateStub
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render facets correctly", async () => {
    const { wrapper } = await render()
    const checkbox = wrapper.find("input").at(1)
    assert.include(wrapper.find(".filter-section-title").text(), title)
    assert.equal(checkbox.prop("name"), name)
    assert.equal(checkbox.prop("value"), facet["key"])
  })

  it("should return null when the buckets are empty", async () => {
    // $FlowFixMe
    results.buckets = []
    const { wrapper } = await render()
    assert.isFalse(wrapper.isEmpty())
  })

  it("checkbox should call onUpdate when clicked", async () => {
    const { wrapper } = await render()
    const event = { target: { checked: true, name: name, value: facet["key"] } }
    wrapper
      .find("input")
      .at(1)
      .prop("onChange")(event)
    sinon.assert.calledWith(onUpdateStub, event)
  })

  it("whole thing should call onUpdate when clicked", async () => {
    const { wrapper } = await render()
    wrapper
      .find(".facet-visible")
      .at(0)
      .simulate("click")
    sinon.assert.calledWith(onUpdateStub, {
      target: { checked: true, name: name, value: facet["key"] }
    })
  })

  it("should have a button to show / hide the facet list", async () => {
    const { wrapper } = await render()
    assert.ok(wrapper.find(".facet-visible").exists())
    wrapper.find(".filter-section-title").simulate("click")
    assert.isNotOk(wrapper.find(".facet-visible").exists())
  })

  //
  ;[true, false].forEach((isSelected: boolean) => {
    it(`checkbox ${shouldIf(isSelected)} be checked`, async () => {
      const currentlySelected = isSelected ? [facet["key"]] : []
      const { wrapper } = await render({ currentlySelected })
      assert.equal(
        wrapper
          .find("input")
          .at(1)
          .prop("checked"),
        isSelected
      )
    })
  })

  it("should let you filter the options", async () => {
    const { wrapper } = await render()
    // $FlowFixMe
    assert.lengthOf(wrapper.find("SearchFacetItem"), results.buckets.length)
    wrapper
      .find(".facet-filter")
      // $FlowFixMe
      .simulate("change", makeEvent(undefined, results.buckets[0].key))
    assert.lengthOf(wrapper.find("SearchFacetItem"), 1)
  })

  it("should let you clear filter text", async () => {
    const { wrapper } = await render()
    wrapper
      .find(".facet-filter")
      .simulate("change", makeEvent("beep", "some wonderful text"))
    wrapper.find(".clear-icon").simulate("click")
    assert.equal(wrapper.find(".facet-filter").prop("value"), "")
  })
})

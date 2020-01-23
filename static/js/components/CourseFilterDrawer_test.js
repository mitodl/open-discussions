// @flow
import React from "react"
import { mount } from "enzyme"
import sinon, { createSandbox } from "sinon"
import { assert } from "chai"

import CourseFilterDrawer, { facetDisplayMap } from "./CourseFilterDrawer"

import * as utilHooks from "../hooks/util"
import { DESKTOP, PHONE, TABLET } from "../lib/constants"

describe("CourseFilterDrawer", () => {
  let clearAllFiltersStub,
    toggleFacetStub,
    mergeFacetOptionsStub,
    onUpdateFacetsStub,
    sandbox,
    useDeviceCategoryStub

  const render = (props = {}) =>
    mount(
      <CourseFilterDrawer
        activeFacets={{}}
        clearAllFilters={clearAllFiltersStub}
        toggleFacet={toggleFacetStub}
        mergeFacetOptions={mergeFacetOptionsStub}
        onUpdateFacets={onUpdateFacetsStub}
        {...props}
      />
    )

  const activeFacets = {
    type:         ["course"],
    topics:       ["Physics"],
    availability: ["nextWeek"],
    cost:         ["free"],
    offered_by:   ["mitx"]
  }

  beforeEach(() => {
    sandbox = createSandbox()
    clearAllFiltersStub = sandbox.stub()
    toggleFacetStub = sandbox.stub()
    mergeFacetOptionsStub = sandbox.stub()
    onUpdateFacetsStub = sandbox.stub()

    useDeviceCategoryStub = sandbox
      .stub(utilHooks, "useDeviceCategory")
      .returns(DESKTOP)
  })

  afterEach(() => {
    sandbox.restore()
  })

  //
  ;[TABLET, PHONE].forEach(deviceCategory => {
    it(`should render an open control by default when ${deviceCategory}`, () => {
      useDeviceCategoryStub.returns(deviceCategory)
      const wrapper = render()
      assert.ok(wrapper.find(".filter-controls").exists())
      assert.isNotOk(wrapper.find("FilterDisplay").exists())
    })
  })

  //
  ;[TABLET, PHONE].forEach(deviceCategory => {
    it(`should open the drawer when you click the control when ${deviceCategory}`, () => {
      useDeviceCategoryStub.returns(deviceCategory)
      const wrapper = render()
      wrapper.find(".filter-controls").simulate("click")
      assert.ok(wrapper.find("FilterDisplay").exists())
    })
  })

  //
  ;[TABLET, PHONE].forEach(deviceCategory => {
    it(`should let you close the drawer once it's open when ${deviceCategory}`, () => {
      useDeviceCategoryStub.returns(deviceCategory)
      const wrapper = render()
      wrapper.find(".filter-controls").simulate("click")
      assert.ok(wrapper.find("FilterDisplay").exists())
      wrapper.find(".controls i").simulate("click")
      assert.isNotOk(wrapper.find("FilterDisplay").exists())
    })
  })

  describe("FilterDisplay", () => {
    it("should show 'Clear All' if filters active", () => {
      const wrapper = render({
        activeFacets: {
          topic: ["Physics"]
        }
      })
      const clearBtn = wrapper.find(".clear-all-filters")
      assert.ok(clearBtn.exists())
      clearBtn.simulate("click")
      sinon.assert.called(clearAllFiltersStub)
    })

    it("should create SearchFilters", () => {
      const wrapper = render({
        activeFacets
      })

      facetDisplayMap.map(([name, title, labelFn], idx) => {
        const searchFilter = wrapper.find("SearchFilter").at(idx)

        assert.equal(searchFilter.prop("title"), title)
        assert.equal(searchFilter.prop("value"), activeFacets[name][0])
        assert.equal(searchFilter.prop("labelFunction"), labelFn)
        searchFilter.prop("clearFacet")()

        sinon.assert.calledWith(
          toggleFacetStub,
          name,
          activeFacets[name][0],
          false
        )
      })
    })

    it("should render SearchFacets", () => {
      const wrapper = render({
        activeFacets
      })

      facetDisplayMap.map(([name, title, labelFn], idx) => {
        const searchFacet = wrapper.find("SearchFacet").at(idx)
        assert.equal(searchFacet.prop("title"), title)
        assert.equal(searchFacet.prop("name"), name)
        assert.equal(searchFacet.prop("onUpdate"), onUpdateFacetsStub)
        assert.equal(searchFacet.prop("currentlySelected"), activeFacets[name])
        assert.equal(searchFacet.prop("labelFunction"), labelFn)
      })
    })
  })
})

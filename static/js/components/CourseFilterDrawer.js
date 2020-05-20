// @flow
import React, { useState } from "react"
import _ from "lodash"

import SearchFacet from "../components/SearchFacet"
import SearchFilter from "../components/SearchFilter"

import { DESKTOP } from "../lib/constants"
import { useDeviceCategory } from "../hooks/util"
import { resourceLabel } from "../lib/learning_resources"

export const facetDisplayMap = [
  ["audience", null, null],
  ["certification", "Certification", null],
  ["type", "Learning Resource", resourceLabel],
  ["topics", "Subject Area", null],
  ["offered_by", "Offered By", null]
]

type FilterDrawerProps = {
  activeFacets: Function,
  clearAllFilters: Function,
  toggleFacet: Function,
  mergeFacetOptions: Function,
  onUpdateFacets: Function
}

export function FilterDisplay(props: FilterDrawerProps) {
  const {
    activeFacets,
    clearAllFilters,
    toggleFacet,
    mergeFacetOptions,
    onUpdateFacets
  } = props

  const anyFiltersActive =
    _.flatten(_.toArray(Object.values(activeFacets))).length > 0

  return (
    <>
      <div className="active-search-filters">
        {anyFiltersActive ? (
          <div className="filter-section-title">
            Filters
            <span className="clear-all-filters" onClick={clearAllFilters}>
              Clear All
            </span>
          </div>
        ) : null}
        {facetDisplayMap.map(([name, , labelFunction]) =>
          (activeFacets[name] || []).map((facet, i) => (
            <SearchFilter
              key={i}
              value={facet}
              clearFacet={() => toggleFacet(name, facet, false)}
              labelFunction={labelFunction}
            />
          ))
        )}
      </div>
      {facetDisplayMap.map(([name, title, labelFunction], i) => (
        <SearchFacet
          key={i}
          title={title}
          name={name}
          results={mergeFacetOptions(name)}
          onUpdate={onUpdateFacets}
          currentlySelected={activeFacets[name] || []}
          labelFunction={labelFunction}
        />
      ))}
    </>
  )
}

export default function CourseFilterDrawer(props: FilterDrawerProps) {
  const deviceCategory = useDeviceCategory()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (deviceCategory === DESKTOP) {
    return <FilterDisplay {...props} />
  }

  const closeDrawer = () => setDrawerOpen(false)

  return drawerOpen ? (
    <div className="course-filter-drawer-open">
      <div className="controls">
        <i className="material-icons" onClick={closeDrawer}>
          close
        </i>
      </div>
      <div className="apply-filters">
        <button onClick={closeDrawer} className="blue-btn">
          Apply Filters
        </button>
      </div>
      <div className="contents">
        <FilterDisplay {...props} />
      </div>
    </div>
  ) : (
    <div className="controls">
      <div onClick={() => setDrawerOpen(true)} className="filter-controls">
        Filter Results
        <i className="material-icons">arrow_drop_down</i>
      </div>
    </div>
  )
}

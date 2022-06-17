// @flow
import React, { useState } from "react"
import _ from "lodash"

import SearchFacet from "./SearchFacet"
import FilterableSearchFacet from "./FilterableSearchFacet"
import SearchFilter from "./SearchFilter"

import { DESKTOP } from "../../lib/constants"
import { useDeviceCategory } from "../../hooks/util"
import { resourceLabel } from "../../lib/learning_resources"

type DMap = Array<[string, ?string, ?Function, boolean]>

export const facetDisplayMap: DMap = [
  ["audience", null, null, false],
  ["certification", "Certification", null, false],
  ["type", "Learning Resource", resourceLabel, false],
  ["topics", "Subject Area", null, true],
  ["offered_by", "Offered By", null, true]
]

type FilterDrawerProps = {
  activeFacets: Function,
  clearAllFilters: Function,
  toggleFacet: Function,
  facetOptions: Function,
  onUpdateFacets: Function
}

// I had to add a `React.memo` call here because this component
// was slowing down rendering for the whole page.
export const FilterDisplay = React.memo<FilterDrawerProps>(
  function FilterDisplay(props: FilterDrawerProps) {
    const {
      activeFacets,
      clearAllFilters,
      toggleFacet,
      facetOptions,
      onUpdateFacets
    } = props

    const anyFiltersActive =
      _.flatten(_.toArray(Object.values(activeFacets))).length > 0

    return (
      <>
        {anyFiltersActive ? (
          <div className="active-search-filters">
            <div className="filter-section-title">
              Filters
              <span
                className="clear-all-filters"
                onClick={clearAllFilters}
                onKeyPress={e => {
                  if (e.key === "Enter") {
                    clearAllFilters()
                  }
                }}
                tabIndex="0"
              >
                Clear All
              </span>
            </div>
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
        ) : null}
        {facetDisplayMap.map(
          ([name, title, labelFunction, useFilterableFacet], i) =>
            useFilterableFacet ? (
              <FilterableSearchFacet
                key={i}
                title={title}
                name={name}
                results={facetOptions(name)}
                onUpdate={onUpdateFacets}
                currentlySelected={activeFacets[name] || []}
                labelFunction={labelFunction}
              />
            ) : (
              <SearchFacet
                key={i}
                title={title}
                name={name}
                results={facetOptions(name)}
                onUpdate={onUpdateFacets}
                currentlySelected={activeFacets[name] || []}
                labelFunction={labelFunction}
              />
            )
        )}
      </>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.activeFacets === nextProps.activeFacets &&
      prevProps.clearAllFilters === nextProps.clearAllFilters &&
      prevProps.toggleFacet === nextProps.toggleFacet &&
      prevProps.facetOptions === nextProps.facetOptions &&
      prevProps.onUpdateFacets === nextProps.onUpdateFacets
    )
  }
)

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

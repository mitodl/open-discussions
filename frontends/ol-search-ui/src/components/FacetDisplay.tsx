import React from "react"

import Facet from "./Facet"
import SearchFilter from "./SearchFilter"
import { Aggregation, Facets } from "@mitodl/course-search-utils"
import { FacetManifest, FacetKey } from "../interfaces"

interface Props {
  facetMap: FacetManifest
  facetOptions: (group: string) => Aggregation | null
  activeFacets: Facets
  onUpdateFacets: React.ChangeEventHandler<HTMLInputElement>
  clearAllFilters: () => void
  toggleFacet: (name: string, value: string, isEnabled: boolean) => void
}

const FacetDisplay = React.memo(
  function FacetDisplay(props: Props) {
    const {
      facetMap,
      facetOptions,
      activeFacets,
      onUpdateFacets,
      clearAllFilters,
      toggleFacet
    } = props

    return (
      <React.Fragment>
        {Object.values(activeFacets).some(filters => filters.length > 0) ? (
          <div className="active-search-filters">
            <div className="filter-section-main-title">
              Filters
              <span
                className="clear-all-filters"
                onClick={clearAllFilters}
                onKeyPress={e => {
                  if (e.key === "Enter") {
                    clearAllFilters()
                  }
                }}
                tabIndex={0}
              >
                Clear All
              </span>
            </div>
            {facetMap.map(([name]) =>
              (activeFacets[name as FacetKey] || []).map((activeFacet, i) => (
                <SearchFilter
                  key={i}
                  value={activeFacet}
                  clearFacet={() =>
                    toggleFacet(name as string, activeFacet, false)
                  }
                />
              ))
            )}
          </div>
        ) : null}
        {facetMap.map(([name, title], key) => (
          <Facet
            key={key}
            title={title}
            name={name as string}
            results={facetOptions(name)}
            onUpdate={onUpdateFacets}
            currentlySelected={activeFacets[name] || []}
          />
        ))}
      </React.Fragment>
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

export default FacetDisplay

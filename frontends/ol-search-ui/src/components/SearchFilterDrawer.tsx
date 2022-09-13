import React, { useCallback, useState } from "react"

import FacetDisplay from "./FacetDisplay"
import { FacetManifest } from "../interfaces"

import { Aggregation, Facets } from "@mitodl/course-search-utils"

interface Props {
  facetMap: FacetManifest
  facetOptions: (group: string) => Aggregation | null
  activeFacets: Facets
  onUpdateFacets: React.ChangeEventHandler<HTMLInputElement>
  clearAllFilters: () => void
  toggleFacet: (name: string, value: string, isEnabled: boolean) => void
  /**
   * Whether the drawer is always open. Useful in some wider-screen layouts.
   */
  alwaysOpen?: boolean
}

export default function SearchFilterDrawer(props: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      setDrawerOpen(true)
    },
    [setDrawerOpen]
  )

  const closeDrawer = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      setDrawerOpen(false)
    },
    [setDrawerOpen]
  )

  if (props.alwaysOpen) {
    return (
      <div className="mt-0 pt-3">
        <FacetDisplay {...props} />
      </div>
    )
  }

  return drawerOpen ? (
    <div className="search-filter-drawer-open">
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
        <FacetDisplay {...props} />
      </div>
    </div>
  ) : (
    <div className="mt-3">
      <div className="controls">
        <div onClick={openDrawer} className="filter-controls">
          Filter
          <i className="material-icons">arrow_drop_down</i>
        </div>
      </div>
    </div>
  )
}

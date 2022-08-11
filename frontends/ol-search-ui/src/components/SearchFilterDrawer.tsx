import React, { useCallback, useState } from "react"

import FacetDisplay from "./FacetDisplay"
import { useDeviceCategory, DESKTOP } from "ol-util"
import { FacetManifest } from "../interfaces"

import { Aggregation, Facets } from "@mitodl/course-search-utils"

interface Props {
  facetMap: FacetManifest
  facetOptions: (group: string) => Aggregation | null
  activeFacets: Facets
  onUpdateFacets: React.ChangeEventHandler<HTMLInputElement>
  clearAllFilters: () => void
  toggleFacet: (name: string, value: string, isEnabled: boolean) => void
}

export default function SearchFilterDrawer(props: Props) {
  const deviceCategory = useDeviceCategory()
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

  if (deviceCategory === DESKTOP) {
    return (
      <div className="col-12 col-lg-3 mt-3 mt-lg-0 facet-display-wrapper pt-3">
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
    <div className="col-12 col-lg-3 mt-3 mt-lg-0">
      <div className="controls">
        <div onClick={openDrawer} className="filter-controls">
          Filter
          <i className="material-icons">arrow_drop_down</i>
        </div>
      </div>
    </div>
  )
}

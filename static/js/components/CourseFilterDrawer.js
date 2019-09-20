// @flow
import React, { useState } from "react"

import { DESKTOP } from "../lib/constants"
import { useDeviceCategory } from "../hooks/util"

type Props = {
  children: React$Node
}

export default function CourseFilterDrawer(props: Props) {
  const { children } = props

  const deviceCategory = useDeviceCategory()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (deviceCategory === DESKTOP) {
    return children
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
      <div className="contents">{children}</div>
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

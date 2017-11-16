// @flow
// using the 'import * as' syntax to include types
import React from "react"
import type { ChildrenArray } from "react"

type SidebarProps = {
  children: ChildrenArray<any>
}

const Sidebar = ({ children }: SidebarProps) =>
  <div className="sidebar">
    {children}
  </div>

export default Sidebar

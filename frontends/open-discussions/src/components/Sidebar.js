// @flow
// using the 'import * as' syntax to include types
import React from "react"
import type { ChildrenArray } from "react"

type SidebarProps = {
  children: ChildrenArray<any>,
  className: string
}

const Sidebar = ({ children, className }: SidebarProps) => (
  <div className={`sidebar ${className}`}>{children}</div>
)

export default Sidebar

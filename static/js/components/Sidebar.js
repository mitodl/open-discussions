// @flow
// using the 'import * as' syntax to include types
import * as React from "react"

type SidebarProps = {
  children: React.ChildrenArray<any>
}

const Sidebar = ({ children }: SidebarProps) =>
  <div className="sidebar">
    {children}
  </div>

export default Sidebar

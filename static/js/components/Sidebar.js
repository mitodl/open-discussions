// @flow
import React from "react"

type SidebarProps = {
  children: React$Element<*, *, *>
}

const Sidebar = ({ children }: SidebarProps) =>
  <div className="sidebar">
    {children}
  </div>

export default Sidebar

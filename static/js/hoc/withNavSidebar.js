// @flow
import React from "react"

import NavSidebar from "../components/NavSidebar"
import Sidebar from "../components/Sidebar"

const withNavSidebar = (WrappedComponent: Class<React.Component<*, *>>) => {
  class WithNavSidebar extends React.Component<*, *> {
    render() {
      return (
        <div className="content has-left-sidebar">
          <Sidebar className="sidebar-left">
            <NavSidebar {...this.props} />
          </Sidebar>
          <div className="main-content">
            <WrappedComponent {...this.props} />
          </div>
        </div>
      )
    }
  }
  return WithNavSidebar
}

export default withNavSidebar

// @flow
import React from "react"

import ChannelSidebar from "../components/ChannelSidebar"
import NavSidebar from "../components/NavSidebar"
import Sidebar from "../components/Sidebar"

const withNavAndChannelSidebars = (
  WrappedComponent: Class<React.Component<*, *>>
) => {
  class WithNavAndChannelSidebars extends React.Component<*, *> {
    render() {
      return (
        <div className="content has-left-sidebar has-right-sidebar">
          <Sidebar className="sidebar-left">
            <NavSidebar {...this.props} />
          </Sidebar>
          <div className="main-content">
            <WrappedComponent {...this.props} />
          </div>
          <Sidebar className="sidebar-right">
            <ChannelSidebar {...this.props} />
          </Sidebar>
        </div>
      )
    }
  }
  return WithNavAndChannelSidebars
}

export default withNavAndChannelSidebars

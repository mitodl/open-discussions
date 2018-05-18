// @flow
import React from "react"
import R from "ramda"

import ChannelSidebar from "../components/ChannelSidebar"
import NavSidebar from "../components/NavSidebar"
import Sidebar from "../components/Sidebar"

const withNavAndChannelSidebars = R.curry(
  (className: string, WrappedComponent: Class<React.Component<*, *>>) => {
    class WithNavAndChannelSidebars extends React.Component<*, *> {
      render() {
        return (
          <div
            className={`content has-left-sidebar has-right-sidebar ${className}`}
          >
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
)

export default withNavAndChannelSidebars

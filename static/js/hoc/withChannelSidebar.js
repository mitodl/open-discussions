// @flow
import React from "react"
import R from "ramda"

import ChannelSidebar from "../components/ChannelSidebar"
import Sidebar from "../components/Sidebar"

const withChannelSidebar = R.curry(
  (className: string, WrappedComponent: Class<React.Component<*, *>>) => {
    class WithChannelSidebar extends React.Component<*, *> {
      static WrappedComponent: Class<React.Component<*, *>>

      render() {
        return (
          <div className={`main-content two-column ${className}`}>
            <WrappedComponent {...this.props} />
            <Sidebar className="sidebar-right">
              <ChannelSidebar {...this.props} />
            </Sidebar>
          </div>
        )
      }
    }

    WithChannelSidebar.WrappedComponent = WrappedComponent

    return WithChannelSidebar
  }
)

export default withChannelSidebar

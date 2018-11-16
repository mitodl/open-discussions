// @flow
import React from "react"
import R from "ramda"

import ChannelSidebar from "../components/ChannelSidebar"
import Sidebar from "../components/Sidebar"
import withTwoColumns from "./withTwoColumns"

const withChannelSidebar = R.curry(
  (className: string, WrappedComponent: Class<React.Component<*, *>>) => {
    const TwoColumnComponent = withTwoColumns(className, WrappedComponent)

    class WithChannelSidebar extends React.Component<*, *> {
      static WrappedComponent: Class<React.Component<*, *>>

      renderSidebar = () => (
        <Sidebar className="sidebar-right">
          <ChannelSidebar {...this.props} />
        </Sidebar>
      )

      render() {
        return (
          <TwoColumnComponent
            renderSidebar={this.renderSidebar}
            {...this.props}
          />
        )
      }
    }

    WithChannelSidebar.WrappedComponent = WrappedComponent

    return WithChannelSidebar
  }
)

export default withChannelSidebar

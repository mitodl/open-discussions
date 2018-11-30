// @flow
import React from "react"
import R from "ramda"

import ChannelSidebar from "../components/ChannelSidebar"
import Sidebar from "../components/Sidebar"
import { Cell, Grid } from "../components/Grid"

const withChannelSidebar = R.curry(
  (className: string, WrappedComponent: Class<React.Component<*, *>>) => {
    class WithChannelSidebar extends React.Component<*, *> {
      static WrappedComponent: Class<React.Component<*, *>>

      render() {
        return (
          <Grid className={`main-content two-column ${className}`}>
            <Cell width={8}>
              <WrappedComponent {...this.props} />
            </Cell>
            <Cell width={4}>
              <Sidebar className="sidebar-right">
                <ChannelSidebar {...this.props} />
              </Sidebar>
            </Cell>
          </Grid>
        )
      }
    }

    WithChannelSidebar.WrappedComponent = WrappedComponent

    return WithChannelSidebar
  }
)

export default withChannelSidebar

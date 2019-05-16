// @flow
import React from "react"
import R from "ramda"

import ChannelSidebar from "../components/ChannelSidebar"
import PostDetailSidebar from "../containers/PostDetailSidebar"
import Sidebar from "../components/Sidebar"
import { Cell, Grid } from "../components/Grid"

export const withSidebar = R.curry(
  (
    SidebarComponent: Class<React.Component<*, *>>,
    className: string,
    WrappedComponent: Class<React.Component<*, *>>
  ) => {
    class WithSidebar extends React.Component<*, *> {
      static WrappedComponent: Class<React.Component<*, *>>

      render() {
        return (
          <Grid className={`main-content two-column ${className}`}>
            <Cell mobileWidth={8} width={7}>
              <WrappedComponent {...this.props} />
            </Cell>
            <Cell width={5}>
              <Sidebar className="sidebar-right">
                <SidebarComponent {...this.props} />
              </Sidebar>
            </Cell>
          </Grid>
        )
      }
    }

    WithSidebar.WrappedComponent = WrappedComponent

    return WithSidebar
  }
)

export const withChannelSidebar = withSidebar(ChannelSidebar)
export const withPostDetailSidebar = withSidebar(PostDetailSidebar)

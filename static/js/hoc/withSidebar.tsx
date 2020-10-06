import { Class } from "utility-types";

import React from "react";
import R from "ramda";

import ChannelSidebar from "../components/ChannelSidebar";
import PostDetailSidebar from "../pages/PostDetailSidebar";
import Sidebar from "../components/Sidebar";
import { Cell, Grid } from "../components/Grid";

export const withSidebar = R.curry((SidebarComponent: Class<React.Component<any, any>>, className: string, WrappedComponent: Class<React.Component<any, any>>) => {
  class WithSidebar extends React.Component<any, any> {

    static WrappedComponent: Class<React.Component<any, any>>;

    render() {
      return <Grid className={`main-content two-column ${className}`}>
            <Cell width={8}>
              <WrappedComponent {...this.props} />
            </Cell>
            <Cell width={4}>
              <Sidebar className="sidebar-right">
                <SidebarComponent {...this.props} />
              </Sidebar>
            </Cell>
          </Grid>;
    }
  }

  WithSidebar.WrappedComponent = WrappedComponent;

  return WithSidebar;
});

export const withChannelSidebar = withSidebar(ChannelSidebar);
export const withPostDetailSidebar = withSidebar(PostDetailSidebar);
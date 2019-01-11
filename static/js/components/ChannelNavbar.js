// @flow
/* global SETTINGS: false */
import * as React from "react"
import { NavLink } from "react-router-dom"

import { Cell, Grid } from "./Grid"
import IntraPageNav from "./IntraPageNav"

import { channelSearchURL, channelURL } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"

type Props = {
  channel: Channel,
  children?: React.Node
}

export default class ChannelNavbar extends React.Component<Props> {
  render() {
    const { channel, children } = this.props

    return (
      <div className="channel-intra-nav-wrapper">
        <Grid className="main-content two-column channel-intra-nav">
          <Cell width={8}>
            <IntraPageNav>
              <NavLink
                exact
                to={channelURL(channel.name)}
                activeClassName="active"
              >
                Home
              </NavLink>
              {SETTINGS.allow_search ? (
                <NavLink
                  exact
                  to={channelSearchURL(channel.name)}
                  activeClassName="active"
                  className="search-link"
                >
                  <i className="material-icons">search</i>
                </NavLink>
              ) : null}
            </IntraPageNav>
          </Cell>
          <Cell className="extra-navbar-items" width={4}>
            {children}
          </Cell>
        </Grid>
      </div>
    )
  }
}

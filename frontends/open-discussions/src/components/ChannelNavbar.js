// @flow
/* global SETTINGS: false */
import * as React from "react"
import R from "ramda"
import { NavLink } from "react-router-dom"

import { Cell, Grid } from "./Grid"
import IntraPageNav from "./IntraPageNav"

import { channelSearchURL, channelURL, channelAboutURL } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"

type Props = {|
  channel: Channel,
  children?: React.Node
|}

export default class ChannelNavbar extends React.Component<Props> {
  render() {
    const { channel, children } = this.props

    return (
      <div className="channel-intra-nav-wrapper">
        <Grid className="main-content two-column channel-intra-nav">
          <Cell mobileWidth={8} width={7}>
            <IntraPageNav>
              <NavLink
                exact
                to={channelURL(channel.name)}
                activeClassName="active"
                className="home-link"
              >
                Home
              </NavLink>
              {!R.isNil(channel.about) || channel.user_is_moderator ? (
                <NavLink
                  exact
                  to={channelAboutURL(channel.name)}
                  activeClassName="active"
                  className="about-link"
                >
                  About
                </NavLink>
              ) : null}
              <NavLink
                exact
                to={channelSearchURL(channel.name)}
                activeClassName="active"
                className="search-link"
              >
                <i className="material-icons">search</i>
              </NavLink>
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

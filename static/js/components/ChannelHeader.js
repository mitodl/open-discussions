// @flow
/* global SETTINGS: false */
import React from "react"
import { NavLink } from "react-router-dom"

import ChannelBanner from "../containers/ChannelBanner"
import { Cell, Grid } from "./Grid"
import ChannelAvatar, {
  CHANNEL_AVATAR_MEDIUM
} from "../containers/ChannelAvatar"
import IntraPageNav from "./IntraPageNav"
import ChannelSettingsLink from "../containers/ChannelSettingsLink"

import { channelURL, channelSearchURL, channelAboutURL } from "../lib/url"
import { isMobileWidth } from "../lib/util"

import type { Channel } from "../flow/discussionTypes"

type Props = {
  channel: Channel,
  history: Object,
  isModerator: boolean,
  hasNavbar: boolean
}

export default class ChannelHeader extends React.Component<Props> {
  render() {
    const { channel, history, isModerator, hasNavbar } = this.props
    return (
      <div className="channel-page-header">
        <ChannelBanner editable={false} channel={channel} />
        <Grid className="main-content two-column channel-header">
          <Cell className="avatar-headline-row" width={12}>
            <div className="left">
              <ChannelAvatar
                editable={false}
                channel={channel}
                imageSize={CHANNEL_AVATAR_MEDIUM}
              />
              <div className="title-and-headline">
                <div className="title">{channel.title}</div>
                {channel.public_description ? (
                  <div className="headline">{channel.public_description}</div>
                ) : null}
              </div>
            </div>
            <div className="right">
              {isModerator ? (
                <ChannelSettingsLink channel={channel} history={history} />
              ) : null}
            </div>
          </Cell>
        </Grid>
        {hasNavbar ? (
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
                  {isMobileWidth() ? (
                    <NavLink
                      exact
                      to={channelAboutURL(channel.name)}
                      activeClassName="active"
                      className="about-link"
                    >
                      About
                    </NavLink>
                  ) : null}
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
            </Grid>
          </div>
        ) : null}
      </div>
    )
  }
}

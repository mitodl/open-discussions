// @flow
/* global SETTINGS: false */
import * as React from "react"
import { Link } from "react-router-dom"

import ChannelBanner from "../containers/ChannelBanner"
import { Cell, Grid } from "./Grid"
import ChannelAvatar, {
  CHANNEL_AVATAR_MEDIUM
} from "../containers/ChannelAvatar"
import ChannelSettingsLink from "../containers/ChannelSettingsLink"
import ChannelFollowControls from "../containers/ChannelFollowControls"

import { channelURL } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"

type Props = {
  channel: Channel,
  history: Object,
  isModerator: boolean,
  navbarItems?: React.Node
}

export default class ChannelHeader extends React.Component<Props> {
  render() {
    const { channel, history, isModerator, navbarItems } = this.props
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
                <div className="title">
                  <Link to={channelURL(channel.name)}>{channel.title}</Link>
                </div>
                {channel.public_description ? (
                  <div className="headline">{channel.public_description}</div>
                ) : null}
              </div>
            </div>
            <div className="right channel-controls">
              <ChannelFollowControls channel={channel} history={history} />
              {isModerator ? (
                <ChannelSettingsLink channel={channel} history={history} />
              ) : null}
            </div>
          </Cell>
        </Grid>
        {navbarItems}
      </div>
    )
  }
}

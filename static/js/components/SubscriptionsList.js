// @flow
import React from "react"
import { Link } from "react-router-dom"
import R from "ramda"

import ChannelAvatar from "../containers/ChannelAvatar"
import { channelURL, editChannelBasicURL } from "../lib/url"
import type { Channel } from "../flow/discussionTypes"

type Props = {
  subscribedChannels: Array<Channel>,
  currentChannel: ?string
}

const channelClassName = (channelName, currentChannel) =>
  currentChannel === channelName ? "location current-location" : "location"

export default class SubscriptionsList extends React.Component<Props> {
  makeChannelLink = R.curry((channel: Channel) => {
    const { currentChannel } = this.props

    return (
      <div
        className={channelClassName(channel.name, currentChannel)}
        key={channel.name}
      >
        <Link to={channelURL(channel.name)} className="channel-link">
          <ChannelAvatar channel={channel} imageSize="small" />
          <span className="title">{channel.title}</span>
        </Link>
        {channel.user_is_moderator ? (
          <Link
            to={editChannelBasicURL(channel.name)}
            className="material-icons settings-link"
          >
            settings
          </Link>
        ) : null}
      </div>
    )
  })

  render() {
    const { subscribedChannels } = this.props

    const myChannels = subscribedChannels.filter(
      channel => channel.user_is_moderator
    )
    const otherChannels = subscribedChannels.filter(
      channel => !channel.user_is_moderator
    )

    return (
      <div className="location-list subscribed-channels">
        {myChannels.length > 0 ? (
          <div className="my-channels">
            <div className="heading">Channels you moderate</div>
            {myChannels.map(this.makeChannelLink)}
          </div>
        ) : null}
        {otherChannels.length > 0 ? (
          <div className="channels">
            <div className="heading">Channels</div>
            {otherChannels.map(this.makeChannelLink)}
          </div>
        ) : null}
      </div>
    )
  }
}

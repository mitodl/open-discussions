// @flow
import React from "react"
import { Link } from "react-router-dom"

import { channelURL } from "../lib/url"
import type { Channel } from "../flow/discussionTypes"

type Props = {
  subscribedChannels: Array<Channel>,
  currentChannel: ?string
}

const channelClassName = (channelName, currentChannel) =>
  currentChannel === channelName ? "location current-location" : "location"

export default class SubscriptionsList extends React.Component<Props> {
  render() {
    const { subscribedChannels, currentChannel } = this.props

    return (
      <div className="location-list subscribed-channels">
        {subscribedChannels.map(channel => (
          <div
            className={channelClassName(channel.name, currentChannel)}
            key={channel.name}
          >
            <Link to={channelURL(channel.name)}>{channel.title}</Link>
          </div>
        ))}
      </div>
    )
  }
}

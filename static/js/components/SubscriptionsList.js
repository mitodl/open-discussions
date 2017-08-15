// @flow
import React from "react"
import { Link } from "react-router-dom"

import { channelURL } from "../lib/url"
import type { Channel } from "../flow/discussionTypes"

type SubscriptionsListProps = {
  subscribedChannels: Array<Channel>
}

export default class SubscriptionsList extends React.Component {
  props: SubscriptionsListProps

  render() {
    const { subscribedChannels } = this.props

    return (
      <div className="subscriptions">
        {subscribedChannels.map(channel =>
          <div key={channel.name}>
            <Link to={channelURL(channel.name)}>
              {channel.title}
            </Link>
          </div>
        )}
      </div>
    )
  }
}

// @flow
import React from "react"
import ReactGA from "react-ga"
import type { Location } from "react-router"
import type { Channel } from "../flow/discussionTypes"

type ChannelTrackerProps = {
  channel: Channel,
  location: Location
}

export class ChannelTracker extends React.Component<ChannelTrackerProps> {
  componentDidMount() {
    const { channel, location } = this.props
    if (channel.ga_tracking_id) {
      const trackerName = channel.ga_tracking_id.replace(/-/g, "_")
      ReactGA.ga("create", channel.ga_tracking_id, "auto", {
        name: trackerName
      })
      ReactGA.ga(`${trackerName}.send`, "pageview", location.pathname)
    }
  }

  render() {
    return null
  }
}

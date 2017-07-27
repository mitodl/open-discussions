// @flow
import React from "react"

import type { Channel } from "../flow/discussionTypes"

export default class ChannelSidebar extends React.Component {
  props: {
    channel: Channel
  }
  render() {
    const { channel } = this.props

    return (
      <div className="sidebar">
        <button className="new-post">Submit a New Post</button>
        <h3 className="title">
          {channel.title}
        </h3>
        <p className="num-users">
          {channel.num_users} users
        </p>
        <h4 className="about">About</h4>
        <p className="description">
          {channel.public_description}
        </p>
      </div>
    )
  }
}

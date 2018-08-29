// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "./Card"
import { Markdown } from "./Markdown"

import { editChannelBasicURL, channelModerationURL } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"

type ChannelSidebarProps = {
  channel: Channel,
  isModerator: boolean
}

const ChannelSidebar = ({ channel, isModerator }: ChannelSidebarProps) => {
  if (!channel) {
    return null
  }
  return (
    <div>
      <Card title="About this channel" className="channel-about">
        {isModerator ? (
          <div className="edit-button">
            <Link to={editChannelBasicURL(channel.name)}>
              <i className="material-icons edit">edit</i>
            </Link>
          </div>
        ) : null}
        <Markdown
          source={
            channel.public_description ||
            "(There is no description of this channel)"
          }
          className="description"
        />
      </Card>
      {isModerator ? (
        <Card title="Moderation Tools" className="channel-about">
          <div className="mod-link-wrapper">
            <Link to={channelModerationURL(channel.name)}>
              View reported posts & comments
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

export default ChannelSidebar

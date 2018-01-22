// @flow
import React from "react"
import ReactMarkdown from "react-markdown"
import { Link } from "react-router-dom"

import Card from "./Card"

import { editChannelURL, channelModerationURL } from "../lib/url"

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
        {isModerator
          ? <div className="edit-button">
            <Link to={editChannelURL(channel.name)}>
              <i className="material-icons edit">edit</i>
            </Link>
          </div>
          : null}
        <ReactMarkdown
          disallowedTypes={["Image"]}
          source={
            channel.description || "(There is no description of this channel)"
          }
          escapeHtml
          className="description"
        />
      </Card>
      {isModerator
        ? <Card title="Moderation Tools" className="channel-about">
          <div className="mod-link-wrapper">
            <Link to={channelModerationURL(channel.name)}>
                View reported posts & comments
            </Link>
          </div>
        </Card>
        : null}
    </div>
  )
}

export default ChannelSidebar

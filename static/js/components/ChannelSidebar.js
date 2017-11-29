// @flow
import React from "react"
import ReactMarkdown from "react-markdown"

import Card from "./Card"

import type { Channel } from "../flow/discussionTypes"

type ChannelSidebarProps = {
  channel: Channel
}

const ChannelSidebar = ({ channel }: ChannelSidebarProps) => {
  if (!channel) {
    return null
  }
  return (
    <Card title="About this channel" className="channel-about">
      <ReactMarkdown
        disallowedTypes={["Image"]}
        source={
          channel.public_description ||
          "(There is no description of this channel)"
        }
        escapeHtml
        className="description"
      />
    </Card>
  )
}

export default ChannelSidebar

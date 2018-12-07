// @flow
/* global SETTINGS: false */
import React from "react"
import { Link } from "react-router-dom"

import Card from "./Card"
import { Markdown } from "./Markdown"
import ChannelWidgetList from "./widgets/ChannelWidgetList"

import { editChannelBasicURL } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"

type ChannelSidebarProps = {
  channel: ?Channel,
  isModerator: boolean
}

const ChannelSidebar = ({ channel, isModerator }: ChannelSidebarProps) => {
  if (!channel) {
    return null
  }
  return (
    <div>
      {SETTINGS.allow_widgets_ui ? (
        <ChannelWidgetList channel={channel} />
      ) : (
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
              channel.description || "(There is no description of this channel)"
            }
            className="description"
          />
        </Card>
      )}
    </div>
  )
}

export default ChannelSidebar

// @flow
/* global SETTINGS: false */
import React from "react"

import ChannelWidgetList from "./widgets/ChannelWidgetList"

import type { Channel } from "../flow/discussionTypes"

type ChannelSidebarProps = {|
  channel: ?Channel
|}

const ChannelSidebar = ({ channel }: ChannelSidebarProps) =>
  channel ? (
    <div>
      <ChannelWidgetList channel={channel} />
    </div>
  ) : null

export default ChannelSidebar

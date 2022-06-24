// @flow
import React from "react"

import WidgetListContainer from "./WidgetListContainer"

import type { Channel } from "../../flow/discussionTypes"

type ChannelWidgetListProps = {
  channel: Channel
}

const ChannelWidgetList = ({ channel }: ChannelWidgetListProps) =>
  channel.widget_list_id ? (
    <WidgetListContainer widgetListId={channel.widget_list_id} />
  ) : null

export default ChannelWidgetList

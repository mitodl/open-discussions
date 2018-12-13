// @flow
import React from "react"

import WidgetList from "../../containers/widgets/WidgetList"

import type { Channel } from "../../flow/discussionTypes"

type ChannelWidgetListProps = {
  channel: Channel
}

const ChannelWidgetList = ({ channel }: ChannelWidgetListProps) =>
  channel.widget_list_id ? (
    <WidgetList widgetListId={channel.widget_list_id} />
  ) : null

export default ChannelWidgetList

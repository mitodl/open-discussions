// @flow
import React from "react"

import WidgetList from "./WidgetList"

import MarkdownWidget from "./MarkdownWidget"
import { fetchJSONWithAuthFailure } from "../../lib/fetch_auth"

import type { Channel } from "../../flow/discussionTypes"

const renderers = {
  markdown: MarkdownWidget
}

type ChannelWidgetListProps = {
  channel: Channel
}

const ChannelWidgetList = ({ channel }: ChannelWidgetListProps) =>
  channel.widget_list_id ? (
    <WidgetList
      widgetListId={channel.widget_list_id}
      renderers={renderers}
      fetchData={fetchJSONWithAuthFailure}
    />
  ) : null

export default ChannelWidgetList

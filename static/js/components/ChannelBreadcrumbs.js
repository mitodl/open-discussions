// @flow
import React from "react"
import { Link } from "react-router-dom"

import { FRONTPAGE_URL, channelURL, channelModerationURL } from "../lib/url"
import type { Channel } from "../flow/discussionTypes"

type BreadCrumbProps = {
  channel: Channel
}

export const ChannelBreadcrumbs = (props: BreadCrumbProps) => {
  const { channel } = props

  return (
    <div className="breadcrumbs">
      <Link to={FRONTPAGE_URL}>Home</Link>&nbsp;&nbsp;
      <span>&gt;</span>&nbsp;&nbsp;
      <Link to={channelURL(channel.name)}>{channel.title}</Link>
    </div>
  )
}

export const ChannelModerationBreadcrumbs = (props: BreadCrumbProps) => {
  const { channel } = props

  return (
    <div className="breadcrumbs">
      <Link to={FRONTPAGE_URL}>Home</Link>&nbsp;&nbsp;
      <span>&gt;</span>&nbsp;&nbsp;
      <Link to={channelURL(channel.name)}>{channel.title}</Link>&nbsp;&nbsp;
      <span>&gt;</span>&nbsp;&nbsp;
      <Link to={channelModerationURL(channel.name)}>
        Reported Posts & Comments
      </Link>
    </div>
  )
}

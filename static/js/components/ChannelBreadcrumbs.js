// @flow
import React from "react"
import { Link } from "react-router-dom"

import { channelURL } from "../lib/url"
import type { Channel } from "../flow/discussionTypes"

type BreadCrumbProps = {
  channel: Channel
}

const ChannelBreadcrumbs = (props: BreadCrumbProps) => {
  const { channel } = props

  return (
    <div className="breadcrumbs">
      <Link to="/">Discussions</Link>&nbsp;
      <span>&gt;</span>&nbsp;
      <Link to={channelURL(channel.name)}>{channel.title}</Link>
    </div>
  )
}

export default ChannelBreadcrumbs

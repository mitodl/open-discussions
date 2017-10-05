// @flow
import React from "react"
import { Link } from "react-router-dom"

import { FRONTPAGE_URL, channelURL } from "../lib/url"
import type { Channel } from "../flow/discussionTypes"

type BreadCrumbProps = {
  channel: Channel
}

const ChannelBreadcrumbs = (props: BreadCrumbProps) => {
  const { channel } = props

  return (
    <div className="breadcrumbs">
      <Link to={FRONTPAGE_URL}>Home</Link>&nbsp;&nbsp;
      <span>&gt;</span>&nbsp;&nbsp;
      <Link to={channelURL(channel.name)}>{channel.title}</Link>
    </div>
  )
}

export default ChannelBreadcrumbs

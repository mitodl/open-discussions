// @flow
import React from "react"
import { Link } from "react-router-dom"

import type { Channel } from "../flow/discussionTypes"

type BreadCrumbProps = {
  channel: Channel
}

const ChannelBreadcrumbs = (props: BreadCrumbProps) => {
  const { channel } = props

  return (
    <div>
      <Link to="/">Discussions</Link>&nbsp;
      <span>&gt;</span>&nbsp;
      <Link to={`/channel/${channel.name}`}>{channel.title}</Link>
    </div>
  )
}

export default ChannelBreadcrumbs

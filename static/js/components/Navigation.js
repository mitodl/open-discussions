// @flow
import React from "react"
import { Link } from "react-router-dom"

import SubscriptionsList from "./SubscriptionsList"

import { newPostURL, getChannelNameFromPathname } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"

type NavigationProps = {
  pathname: string,
  subscribedChannels: Array<Channel>
}

const Navigation = (props: NavigationProps) => {
  const { subscribedChannels, pathname } = props

  const channelName = getChannelNameFromPathname(pathname)

  return (
    <div className="navigation">
      <Link
        className="mdc-button mdc-button--raised blue-button"
        to={newPostURL(channelName)}
      >
        Submit a New Post
      </Link>
      <SubscriptionsList subscribedChannels={subscribedChannels} />
    </div>
  )
}

export default Navigation

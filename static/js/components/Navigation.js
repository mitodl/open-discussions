// @flow
import React from "react"
import { Link } from "react-router-dom"

import SubscriptionsList from "./SubscriptionsList"

import { newPostURL } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"

const submitPostButton = channelName =>
  <Link
    className="mdc-button mdc-button--raised blue-button"
    to={newPostURL(channelName)}
  >
    Submit a New Post
  </Link>

type NavigationProps = {
  channelName?: string,
  subscribedChannels: Array<Channel>
}

const Navigation = (props: NavigationProps) => {
  const { subscribedChannels, channelName } = props

  return (
    <div className="navigation">
      {channelName ? submitPostButton(channelName) : null}
      <SubscriptionsList subscribedChannels={subscribedChannels} />
    </div>
  )
}

export default Navigation

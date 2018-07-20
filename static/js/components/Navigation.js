// @flow
import React from "react"
import R from "ramda"
import { Link } from "react-router-dom"

import SubscriptionsList from "./SubscriptionsList"

import { userCanPost } from "../lib/channels"
import {
  newPostURL,
  getChannelNameFromPathname,
  FRONTPAGE_URL
} from "../lib/url"
import { userIsAnonymous } from "../lib/util"

import type { Channel } from "../flow/discussionTypes"

type NavigationProps = {
  channels: Map<string, Channel>,
  pathname: string,
  subscribedChannels: Array<Channel>
}

const Navigation = (props: NavigationProps) => {
  const { channels, subscribedChannels, pathname } = props

  const channelName = getChannelNameFromPathname(pathname)

  const currentChannel = channels.get(channelName)
  const showPostButton =
    !userIsAnonymous() &&
    (currentChannel
      ? userCanPost(currentChannel)
      : R.any(userCanPost, [...channels.values()]))

  const homeClassName =
    pathname === "/" ? "location current-location" : "location"

  return (
    <div className="navigation">
      {showPostButton ? (
        <Link
          className="mdc-button mdc-button--raised blue-button"
          to={newPostURL(channelName)}
        >
          Submit a New Post
        </Link>
      ) : null}
      <div className="location-list">
        <div className={homeClassName}>
          <Link className="home-link" to={FRONTPAGE_URL}>
            <i className="material-icons home">home</i>
            Home
          </Link>
        </div>
      </div>
      <SubscriptionsList
        currentChannel={channelName}
        subscribedChannels={subscribedChannels}
      />
    </div>
  )
}

export default Navigation

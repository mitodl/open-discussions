// @flow
import React from "react"
import { Link } from "react-router-dom"

import SubscriptionsList from "./SubscriptionsList"
import UserInfo from "./UserInfo"

import {
  newPostURL,
  getChannelNameFromPathname,
  FRONTPAGE_URL
} from "../lib/url"
import { userIsAnonymous } from "../lib/util"

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
      <UserInfo />
      {userIsAnonymous() ? null : (
        <Link
          className="mdc-button mdc-button--raised blue-button"
          to={newPostURL(channelName)}
        >
          Submit a New Post
        </Link>
      )}
      <Link className="home-link" to={FRONTPAGE_URL}>
        <i className="material-icons home">home</i>
        Home
      </Link>
      <SubscriptionsList
        currentChannel={channelName}
        subscribedChannels={subscribedChannels}
      />
      {userIsAnonymous() ? null : (
        <Link className="settings-link" to="/settings">
          Settings
        </Link>
      )}
    </div>
  )
}

export default Navigation

// @flow
import React from "react"
import { Link } from "react-router-dom"

import SubscriptionsList from "./SubscriptionsList"
import LoginTooltip from "./LoginTooltip"
import NavigationItem from "./NavigationItem"

import { getChannelNameFromPathname, FRONTPAGE_URL } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"

type Props = {
  pathname: string,
  subscribedChannels: Array<Channel>,
  showComposeLink: boolean,
  composeHref: ?string
}

const Navigation = ({
  subscribedChannels,
  pathname,
  showComposeLink,
  composeHref
}: Props) => (
  <div className="navigation">
    <div className="location-list">
      <div
        className={pathname === "/" ? "location current-location" : "location"}
      >
        <Link className="home-link" to={FRONTPAGE_URL}>
          <NavigationItem
            badge={() => <i className="material-icons home">home</i>}
            whenExpanded={() => <span className="title">Home</span>}
          />
        </Link>
      </div>
    </div>
    {showComposeLink ? (
      <LoginTooltip>
        <div className="new-post-link-container">
          <Link to={composeHref || "#"} className="new-post-link">
            <NavigationItem
              badge={() => <i className="material-icons add">add</i>}
              whenExpanded={() => <span className="title">Compose</span>}
            />
          </Link>
        </div>
      </LoginTooltip>
    ) : null}
    <SubscriptionsList
      currentChannel={getChannelNameFromPathname(pathname)}
      subscribedChannels={subscribedChannels}
    />
  </div>
)

export default Navigation

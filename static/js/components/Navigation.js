// @flow
import React from "react"
import { Link } from "react-router-dom"

import SubscriptionsList from "./SubscriptionsList"
import LoginPopup from "./LoginPopup"
import NavigationItem from "./NavigationItem"

import { getChannelNameFromPathname, FRONTPAGE_URL } from "../lib/url"
import { preventDefaultAndInvoke, userIsAnonymous } from "../lib/util"

import type { Channel } from "../flow/discussionTypes"

const ComposeButtonContents = () => (
  <NavigationItem
    badge={() => <i className="material-icons add">add</i>}
    whenExpanded={() => <span className="title">Compose</span>}
  />
)

type NavigationProps = {
  pathname: string,
  subscribedChannels: Array<Channel>,
  showComposeLink: boolean,
  composeHref: ?string,
  useLoginPopup: boolean
}

type State = {
  popupVisible: boolean
}

class Navigation extends React.Component<NavigationProps, State> {
  constructor() {
    super()
    this.state = {
      popupVisible: false
    }
  }

  onTogglePopup = async () => {
    const { popupVisible } = this.state
    this.setState({
      popupVisible: !popupVisible
    })
  }

  render() {
    const {
      subscribedChannels,
      pathname,
      showComposeLink,
      composeHref,
      useLoginPopup
    } = this.props

    const channelName = getChannelNameFromPathname(pathname)
    const homeClassName =
      pathname === "/" ? "location current-location" : "location"

    let composeBtn
    if (showComposeLink) {
      if (useLoginPopup) {
        composeBtn = (
          <a
            href="#"
            onClick={preventDefaultAndInvoke(this.onTogglePopup)}
            className="new-post-link"
          >
            <ComposeButtonContents />
          </a>
        )
      } else if (composeHref) {
        composeBtn = (
          <Link to={composeHref} className="new-post-link">
            <ComposeButtonContents />
          </Link>
        )
      }
    }

    return (
      <div className="navigation">
        <div className="location-list">
          <div className={homeClassName}>
            <Link className="home-link" to={FRONTPAGE_URL}>
              <NavigationItem
                badge={() => <i className="material-icons home">home</i>}
                whenExpanded={() => <span className="title">Home</span>}
              />
            </Link>
          </div>
        </div>
        {composeBtn ? (
          <div className="new-post-link-container">{composeBtn}</div>
        ) : null}
        {userIsAnonymous() ? (
          <LoginPopup
            visible={this.state.popupVisible}
            closePopup={this.onTogglePopup}
            className="compose-popup"
          />
        ) : null}
        <SubscriptionsList
          currentChannel={channelName}
          subscribedChannels={subscribedChannels}
        />
      </div>
    )
  }
}

export default Navigation

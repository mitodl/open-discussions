// @flow
/* global SETTINGS:false */
import React from "react"
import { Link } from "react-router-dom"

import DropdownMenu from "./DropdownMenu"
import ProfileImage from "../containers/ProfileImage"

import { isProfileComplete } from "../lib/util"
import { profileURL, SETTINGS_URL } from "../lib/url"

import type { Profile } from "../flow/discussionTypes"

export default class UserMenu extends React.Component<*, *> {
  props: {
    profile: Profile,
    toggleShowUserMenu: Function,
    showUserMenu: boolean
  }

  render() {
    const { toggleShowUserMenu, showUserMenu, profile } = this.props

    return (
      <div className="user-menu">
        <ProfileImage
          editable={false}
          useSmall={true}
          userName={SETTINGS.username}
          profile={profile}
          onClick={toggleShowUserMenu}
        />
        {SETTINGS.profile_ui_enabled && !isProfileComplete(profile) ? (
          <div className="profile-incomplete" />
        ) : null}
        {showUserMenu ? (
          <DropdownMenu closeMenu={toggleShowUserMenu}>
            <li>
              <Link to={SETTINGS_URL}>Settings</Link>
            </li>
            {SETTINGS.profile_ui_enabled && SETTINGS.username ? (
              <li>
                <Link to={profileURL(SETTINGS.username)}>View Profile</Link>
              </li>
            ) : null}
            {SETTINGS.allow_email_auth ? (
              <li>
                <a href="/logout">Sign Out</a>
              </li>
            ) : null}
          </DropdownMenu>
        ) : null}
      </div>
    )
  }
}

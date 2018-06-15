// @flow
/* global SETTINGS:false */
import React from "react"
import { Link } from "react-router-dom"
import onClickOutside from "react-onclickoutside"

import { isProfileComplete, makeProfileImageUrl } from "../lib/util"
import { SETTINGS_URL } from "../lib/url"
import type { Profile } from "../flow/discussionTypes"
export class Dropdown extends React.Component<*, *> {
  handleClickOutside = () => {
    const { toggleShowUserMenu } = this.props

    toggleShowUserMenu()
  }

  render() {
    const { toggleShowUserMenu } = this.props

    return (
      <ul className="user-menu-dropdown">
        <li>
          <Link onClick={toggleShowUserMenu} to={SETTINGS_URL}>
            Settings
          </Link>
        </li>
        {SETTINGS.allow_email_auth ? (
          <li>
            <a href="/logout">Sign Out</a>
          </li>
        ) : null}
      </ul>
    )
  }
}

export const DropdownWithClickOutside = onClickOutside(Dropdown)

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
        <img
          onClick={toggleShowUserMenu}
          className="profile-image"
          src={makeProfileImageUrl(profile)}
        />
        {!isProfileComplete(profile) ? (
          <div className="profile-incomplete" />
        ) : null}
        {showUserMenu ? (
          <DropdownWithClickOutside toggleShowUserMenu={toggleShowUserMenu} />
        ) : null}
      </div>
    )
  }
}

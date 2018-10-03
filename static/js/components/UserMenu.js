// @flow
/* global SETTINGS:false */
import React from "react"
import { Link } from "react-router-dom"

import DropdownMenu from "./DropdownMenu"
import ProfileImage, { PROFILE_IMAGE_SMALL } from "../containers/ProfileImage"

import { isProfileComplete } from "../lib/util"
import { profileURL, SETTINGS_URL, LOGIN_URL, REGISTER_URL } from "../lib/url"

import type { Profile } from "../flow/discussionTypes"

type Props = {
  profile: ?Profile,
  toggleShowUserMenu: Function,
  showUserMenu: boolean
}

type DropdownMenuProps = {
  closeMenu: Function,
  className?: string
}

export const DropDownArrow = () => (
  <i className="material-icons arrow_drop_down">arrow_drop_down</i>
)

export const DropUpArrow = () => (
  <i className="material-icons arrow_drop_up">arrow_drop_up</i>
)

export const LoggedInMenu = (props: DropdownMenuProps) => (
  <DropdownMenu {...props}>
    <li>
      <Link to={SETTINGS_URL}>Settings</Link>
    </li>
    {SETTINGS.profile_ui_enabled && SETTINGS.username ? (
      <li>
        <Link to={profileURL(SETTINGS.username)}>Profile</Link>
      </li>
    ) : null}
    {SETTINGS.allow_email_auth ? (
      <li>
        <a href="/logout">Sign Out</a>
      </li>
    ) : null}
  </DropdownMenu>
)

export const LoggedOutMenu = (props: DropdownMenuProps) => (
  <DropdownMenu {...props}>
    <li>
      <Link to={LOGIN_URL}>Log In</Link>
    </li>
    <li>
      <Link to={REGISTER_URL}>Sign Up</Link>
    </li>
  </DropdownMenu>
)

const UserMenu = ({ toggleShowUserMenu, showUserMenu, profile }: Props) => {
  const ListComponent = profile ? LoggedInMenu : LoggedOutMenu

  return (
    <div className="user-menu">
      <div className="user-menu-clickarea" onClick={toggleShowUserMenu}>
        <ProfileImage
          editable={false}
          userName={SETTINGS.username}
          profile={profile}
          imageSize={PROFILE_IMAGE_SMALL}
        />
        {showUserMenu ? <DropUpArrow /> : <DropDownArrow />}
        {SETTINGS.profile_ui_enabled && !isProfileComplete(profile) ? (
          <div className="profile-incomplete" />
        ) : null}
      </div>
      {showUserMenu ? (
        <ListComponent
          className="user-menu-dropdown"
          closeMenu={toggleShowUserMenu}
        />
      ) : null}
    </div>
  )
}

export default UserMenu

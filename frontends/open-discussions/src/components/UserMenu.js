// @flow
/* global SETTINGS:false */
import React from "react"
import { Link, Route } from "react-router-dom"

import DropdownMenu from "./DropdownMenu"
import ProfileImage, { PROFILE_IMAGE_SMALL } from "./ProfileImage"
import { DropUpArrow, DropDownArrow } from "./Arrow"
import ResponsiveWrapper from "./ResponsiveWrapper"

import { isProfileComplete } from "../lib/util"
import {
  profileURL,
  userListIndexURL,
  SETTINGS_URL,
  LOGIN_URL,
} from "../lib/url"
import { PHONE } from "../lib/constants"

import type { Profile } from "../flow/discussionTypes"

type Props = {
  profile: ?Profile,
  toggleShowUserMenu: Function,
  showUserMenu: boolean,
}

type DropdownMenuProps = {
  closeMenu: Function,
  className?: string,
}

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
    <ResponsiveWrapper onlyOn={[PHONE]}>
      <Route
        path="/learn"
        render={() => (
          <Link className="user-list-link" to={userListIndexURL}>
            My Lists
          </Link>
        )}
      />
    </ResponsiveWrapper>
    <li>
      <a href="/logout">Sign Out</a>
    </li>
  </DropdownMenu>
)

export const LoggedOutMenu = (props: DropdownMenuProps) => (
  <DropdownMenu {...props}>
    <li>
      {SETTINGS.FEATURES.KEYCLOAK_ENABLED ? (
        <a href={LOGIN_URL}>Log In</a>
      ) : (
        <Link to={LOGIN_URL}>Log In</Link>
      )}
    </li>
  </DropdownMenu>
)

const UserMenu = ({ toggleShowUserMenu, showUserMenu, profile }: Props) => {
  const ListComponent = profile ? LoggedInMenu : LoggedOutMenu
  return (
    <div className="user-menu">
      <div
        className="user-menu-clickarea"
        onClick={toggleShowUserMenu}
        onKeyPress={e => {
          if (e.key === "Enter") {
            toggleShowUserMenu()
          }
        }}
        tabIndex="0"
      >
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

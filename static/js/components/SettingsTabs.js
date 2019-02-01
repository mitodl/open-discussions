// @flow
import React from "react"
import { NavLink } from "react-router-dom"
import { withRouter } from "react-router"

import IntraPageNav from "./IntraPageNav"

import { NOTIFICATION_SETTINGS_URL, ACCOUNT_SETTINGS_URL } from "../lib/url"

import type { ContextRouter, Location } from "react-router"

type LinkSpec = {
  isDefault: boolean,
  text: string
}

const activeClassName = "active"

const renderNavLinks = (
  location: Location,
  linkSpecMap: { [to: string]: LinkSpec }
) =>
  Object.keys(linkSpecMap).map((to, i) => {
    const linkSpec = linkSpecMap[to]
    const isPathHandled = location.pathname in linkSpecMap
    const extraClass =
      !isPathHandled && linkSpec.isDefault ? activeClassName : ""
    return (
      <NavLink
        key={i}
        to={to}
        className={`tab ${extraClass}`}
        activeClassName={activeClassName}
      >
        {linkSpec.text}
      </NavLink>
    )
  })

export const SettingsTabs = ({ location }: ContextRouter) => (
  <IntraPageNav>
    {renderNavLinks(location, {
      [NOTIFICATION_SETTINGS_URL]: {
        isDefault: true,
        text:      "Email Notifications"
      },
      [ACCOUNT_SETTINGS_URL]: {
        isDefault: false,
        text:      "Account"
      }
    })}
  </IntraPageNav>
)

export default withRouter<{||}>(SettingsTabs)

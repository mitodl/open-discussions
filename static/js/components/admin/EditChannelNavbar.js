// @flow
import React from "react"
import NavLink from "react-router-dom/NavLink"
import R from "ramda"

import IntraPageNav from "../IntraPageNav"

import {
  editChannelBasicURL,
  editChannelAppearanceURL,
  editChannelModeratorsURL,
  channelModerationURL
} from "../../lib/url"

type Props = {
  channelName: string
}

const membersIsActive = R.curry((channelName, match, location) =>
  location.pathname.startsWith(`/manage/c/edit/${channelName}/members/`)
)

const EditChannelNavbar = ({ channelName }: Props) => (
  <IntraPageNav>
    <NavLink to={editChannelBasicURL(channelName)}>Basic</NavLink>{" "}
    <NavLink to={editChannelAppearanceURL(channelName)}>Appearance</NavLink>
    <NavLink
      to={editChannelModeratorsURL(channelName)}
      isActive={membersIsActive(channelName)}
    >
      Members
    </NavLink>
    <NavLink to={channelModerationURL(channelName)}>Reported Content</NavLink>
  </IntraPageNav>
)

export default EditChannelNavbar

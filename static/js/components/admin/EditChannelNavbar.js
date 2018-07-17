// @flow
import React from "react"
import NavLink from "react-router-dom/NavLink"
import R from "ramda"

import {
  editChannelBasicURL,
  editChannelAppearanceURL,
  editChannelModeratorsURL
} from "../../lib/url"

type Props = {
  channelName: string
}

const membersIsActive = R.curry((channelName, match, location) =>
  location.pathname.startsWith(`/manage/c/edit/${channelName}/members/`)
)
export default class EditChannelNavbar extends React.Component<Props> {
  render() {
    const { channelName } = this.props

    return (
      <div className="edit-channel-navbar">
        <NavLink to={editChannelBasicURL(channelName)}>Basic</NavLink>{" "}
        <NavLink to={editChannelAppearanceURL(channelName)}>Appearance</NavLink>
        <NavLink
          to={editChannelModeratorsURL(channelName)}
          isActive={membersIsActive(channelName)}
        >
          Members
        </NavLink>
      </div>
    )
  }
}

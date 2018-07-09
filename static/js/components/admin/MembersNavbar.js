// @flow
import React from "react"
import NavLink from "react-router-dom/NavLink"

import {
  editChannelModeratorsURL,
  editChannelContributorsURL
} from "../../lib/url"

type MembersNavbarProps = {
  channelName: string
}

export default class MembersNavbar extends React.Component<*, void> {
  props: MembersNavbarProps

  render() {
    const { channelName } = this.props

    return (
      <div className="members-navbar">
        <NavLink to={editChannelModeratorsURL(channelName)}>Moderators</NavLink>{" "}
        <NavLink to={editChannelContributorsURL(channelName)}>
          Contributors
        </NavLink>
      </div>
    )
  }
}

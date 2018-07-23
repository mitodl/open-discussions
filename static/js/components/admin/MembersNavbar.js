// @flow
import React from "react"
import NavLink from "react-router-dom/NavLink"

import { CHANNEL_TYPE_PUBLIC } from "../../lib/channels"
import {
  editChannelModeratorsURL,
  editChannelContributorsURL
} from "../../lib/url"

import type { Channel } from "../../flow/discussionTypes"

type MembersNavbarProps = {
  channel: Channel
}

export default class MembersNavbar extends React.Component<*, void> {
  props: MembersNavbarProps

  render() {
    const { channel } = this.props

    return (
      <div className="members-navbar">
        <NavLink to={editChannelModeratorsURL(channel.name)}>
          Moderators
        </NavLink>{" "}
        {channel.channel_type !== CHANNEL_TYPE_PUBLIC ? (
          <NavLink to={editChannelContributorsURL(channel.name)}>
            Contributors
          </NavLink>
        ) : null}
      </div>
    )
  }
}

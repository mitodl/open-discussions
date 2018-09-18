// @flow
import React from "react"
import NavLink from "react-router-dom/NavLink"

import IntraPageNav from "../IntraPageNav"

import { CHANNEL_TYPE_PUBLIC } from "../../lib/channels"
import {
  editChannelModeratorsURL,
  editChannelContributorsURL
} from "../../lib/url"

import type { Channel } from "../../flow/discussionTypes"

type Props = {
  channel: Channel
}

export default class MembersNavbar extends React.Component<Props, void> {
  render() {
    const { channel } = this.props

    return (
      <IntraPageNav>
        <NavLink to={editChannelModeratorsURL(channel.name)}>
          Moderators
        </NavLink>{" "}
        {channel.channel_type !== CHANNEL_TYPE_PUBLIC ? (
          <NavLink to={editChannelContributorsURL(channel.name)}>
            Contributors
          </NavLink>
        ) : null}
      </IntraPageNav>
    )
  }
}

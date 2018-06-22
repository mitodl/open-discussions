// @flow
import React from "react"
import NavLink from "react-router-dom/NavLink"

import { editChannelBasicURL, editChannelAppearanceURL } from "../../lib/url"

type EditChannelNavbarProps = {
  channelName: string
}

export default class EditChannelNavbar extends React.Component<*, void> {
  props: EditChannelNavbarProps

  render() {
    const { channelName } = this.props

    return (
      <div className="edit-channel-navbar">
        <NavLink to={editChannelBasicURL(channelName)}>Basic</NavLink>{" "}
        <NavLink to={editChannelAppearanceURL(channelName)}>Appearance</NavLink>
      </div>
    )
  }
}

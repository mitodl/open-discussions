// @flow
import React from "react"

import Navigation from "../components/Navigation"

class NavSidebar extends React.Component<*, *> {
  render() {
    const {
      subscribedChannels,
      location: { pathname }
    } = this.props

    return (
      <Navigation subscribedChannels={subscribedChannels} pathname={pathname} />
    )
  }
}

export default NavSidebar

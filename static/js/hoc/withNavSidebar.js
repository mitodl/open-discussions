// @flow
import React from "react"

import Sidebar from "../components/Sidebar"
import Navigation from "../components/Navigation"

const withNavSidebar = (WrappedComponent: Class<React.Component<*, *, *>>) => {
  class WithNavSidebar extends React.Component {
    render() {
      const { subscribedChannels, channelName } = this.props

      return (
        <div className="content">
          <Sidebar>
            <Navigation
              subscribedChannels={subscribedChannels}
              channelName={channelName}
            />
          </Sidebar>
          <div className="main-content">
            <WrappedComponent {...this.props} />
          </div>
        </div>
      )
    }
  }
  return WithNavSidebar
}

export default withNavSidebar

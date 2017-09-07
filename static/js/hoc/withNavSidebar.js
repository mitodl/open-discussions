// @flow
import React from "react"

import Sidebar from "../components/Sidebar"
import Navigation from "../components/Navigation"

const withNavSidebar = (WrappedComponent: Class<React.Component<*, *, *>>) => {
  class WithNavSidebar extends React.Component {
    render() {
      const { subscribedChannels, location: { pathname } } = this.props

      return (
        <div className="content">
          <Sidebar>
            <Navigation
              subscribedChannels={subscribedChannels}
              pathname={pathname}
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

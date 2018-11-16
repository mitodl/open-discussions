// @flow
import React from "react"
import R from "ramda"

import ChannelHeader from "../components/ChannelHeader"

const withChannelHeader = R.curry(
  (hasNavbar: boolean, WrappedComponent: Class<React.Component<*, *>>) => {
    class WithChannelSidebar extends React.Component<*, *> {
      static WrappedComponent: Class<React.Component<*, *>>

      render() {
        const { channel } = this.props

        return (
          <div className="channel-page-wrapper">
            {channel ? (
              <ChannelHeader
                channel={channel}
                isModerator={channel.user_is_moderator}
                hasNavbar={hasNavbar}
              />
            ) : null}
            <WrappedComponent {...this.props} />
          </div>
        )
      }
    }

    WithChannelSidebar.WrappedComponent = WrappedComponent
    WithChannelSidebar.displayName = `withChannelHeader(${
      WrappedComponent.name
    })`
    return WithChannelSidebar
  }
)

export default withChannelHeader

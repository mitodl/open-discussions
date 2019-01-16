// @flow
import React from "react"
import R from "ramda"

import ChannelHeader from "../components/ChannelHeader"

const withChannelHeader = R.curry(
  (WrappedComponent: Class<React.Component<*, *>>) => {
    class WithChannelHeader extends React.Component<*, *> {
      static WrappedComponent: Class<React.Component<*, *>>

      render() {
        const { channel, history, navbarItems } = this.props

        return (
          <div className="channel-page-wrapper">
            {channel ? (
              <ChannelHeader
                channel={channel}
                history={history}
                isModerator={channel.user_is_moderator}
                navbarItems={navbarItems}
              />
            ) : null}
            <WrappedComponent {...this.props} />
          </div>
        )
      }
    }

    WithChannelHeader.WrappedComponent = WrappedComponent
    WithChannelHeader.displayName = `withChannelHeader(${
      WrappedComponent.name
    })`
    return WithChannelHeader
  }
)

export default withChannelHeader

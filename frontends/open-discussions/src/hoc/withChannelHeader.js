// @flow
import React from "react"
import R from "ramda"

import ChannelHeader from "../components/ChannelHeader"
import { BannerPageWrapper } from "ol-util"

const withChannelHeader = R.curry(
  (WrappedComponent: Class<React.Component<*, *>>) => {
    class WithChannelHeader extends React.Component<*, *> {
      static WrappedComponent: Class<React.Component<*, *>>

      render() {
        const { channel, history } = this.props

        return (
          <BannerPageWrapper>
            {channel ? (
              <ChannelHeader
                channel={channel}
                history={history}
                isModerator={channel.user_is_moderator}
              />
            ) : null}
            <WrappedComponent {...this.props} />
          </BannerPageWrapper>
        )
      }
    }

    WithChannelHeader.WrappedComponent = WrappedComponent
    WithChannelHeader.displayName = `withChannelHeader(${WrappedComponent.name})`
    return WithChannelHeader
  }
)

export default withChannelHeader

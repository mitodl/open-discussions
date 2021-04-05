// @flow
import React from "react"
import R from "ramda"

const channelChanged = R.complement(R.eqBy(R.path(["channel", "name"])))

export const withChannelTracker = (
  WrappedComponent: Class<React.Component<*, *>>
) => {
  class WithChannelTracker extends React.Component<*, *> {
    static WrappedComponent: Class<React.Component<*, *>>

    loadGA() {
      const { channel } = this.props
      if (
        channel &&
        channel.ga_tracking_id &&
        window.gtag &&
        (window[`ga-disable-${channel.ga_tracking_id}`] ||
          !window.google_tag_manager ||
          !window.google_tag_manager[channel.ga_tracking_id])
      ) {
        window[`ga-disable-${channel.ga_tracking_id}`] = false
        window.gtag("config", this.props.channel.ga_tracking_id, {
          send_page_view: false
        })
      }
    }

    componentDidMount() {
      this.loadGA()
    }

    componentWillUnmount() {
      const { channel } = this.props
      if (channel && channel.ga_tracking_id) {
        window[`ga-disable-${channel.ga_tracking_id}`] = true
      }
    }

    componentDidUpdate(prevProps: Object) {
      if (channelChanged(prevProps, this.props)) {
        if (prevProps.channel && prevProps.channel.ga_tracking_id) {
          window[`ga-disable-${prevProps.channel.ga_tracking_id}`] = true
        }
        this.loadGA()
      }
    }

    render() {
      return <WrappedComponent {...this.props} />
    }
  }

  WithChannelTracker.WrappedComponent = WrappedComponent

  return WithChannelTracker
}

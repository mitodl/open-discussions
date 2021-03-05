// @flow
import React from "react"
import R from "ramda"

const shouldLoadData = R.complement(
  R.allPass([
    // if channel name doesn't match
    R.eqBy(R.path(["channel", "name"])),
    // if URL path doesn't match
    R.eqBy(R.path(["location", "search"]))
  ])
)

export const withChannelTracker = (
  WrappedComponent: Class<React.Component<*, *>>
) => {
  class WithChannelTracker extends React.Component<*, *> {
    static WrappedComponent: Class<React.Component<*, *>>

    loadGA() {
      const { channel, location } = this.props

      if (channel && channel.ga_tracking_id) {
        window.gtag("config", channel.ga_tracking_id, {
          send_page_view: false
        })

        window.gtag("event", "page_view", {
          page_path: location.pathname,
          send_to:   channel.ga_tracking_id
        })
      }
    }

    componentDidMount() {
      this.loadGA()
    }

    componentDidUpdate(prevProps: Object) {
      if (shouldLoadData(prevProps, this.props)) {
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

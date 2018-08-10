// @flow
import React from "react"
import ReactGA from "react-ga"

export const withChannelTracker = (
  WrappedComponent: Class<React.Component<*, *>>
) => {
  class WithChannelTracker extends React.Component<*, *> {
    isTracked = false

    loadGA() {
      const { channel, location } = this.props
      if (channel && channel.ga_tracking_id && !this.isTracked) {
        const trackerName = channel.ga_tracking_id.replace(/-/g, "_")
        ReactGA.ga("create", channel.ga_tracking_id, "auto", {
          name: trackerName
        })
        ReactGA.ga(`${trackerName}.send`, "pageview", location.pathname)
        this.isTracked = true
      }
    }

    componentDidMount() {
      this.loadGA()
    }

    componentDidUpdate() {
      this.loadGA()
    }

    render() {
      return <WrappedComponent {...this.props} />
    }
  }

  return WithChannelTracker
}

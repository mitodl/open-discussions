// @flow
import React from "react"
import ReactGA from "react-ga"
import R from "ramda"

const shouldLoadData = R.complement(
  R.allPass([
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
        const trackerName = channel.ga_tracking_id.replace(/-/g, "_")
        ReactGA.ga("create", channel.ga_tracking_id, "auto", {
          name: trackerName
        })
        ReactGA.ga(`${trackerName}.send`, "pageview", location.pathname)
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

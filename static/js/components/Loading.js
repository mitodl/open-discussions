// @flow
import React from "react"

type LoadingProps = {
  loaded: boolean,
  errored: boolean
}

const withLoading = (LoadedComponent: Class<React.Component<*, *, *>>) => {
  return class extends LoadedComponent {
    props: LoadingProps

    render() {
      const { loaded, errored } = this.props

      if (errored) {
        return <div className="errored">Error loading page</div>
      }

      if (!loaded) {
        return <div className="loading">Loading</div>
      }

      return (
        <div className="loaded">
          {super.render()}
        </div>
      )
    }
  }
}

export default withLoading

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
        return (
          <div className="loading">
            <div className="sk-three-bounce">
              <div className="sk-child sk-bounce1" />
              <div className="sk-child sk-bounce2" />
              <div className="sk-child sk-bounce3" />
            </div>
          </div>
        )
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

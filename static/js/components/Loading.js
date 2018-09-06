// @flow
import React from "react"

import { NotFound, NotAuthorized } from "../components/ErrorPages"

type LoadingProps = {
  loaded: boolean,
  errored: boolean,
  notFound: boolean,
  notAuthorized: boolean
}

type SpinnerProps = {
  className?: string
}

export const Loading = (props: SpinnerProps) => (
  <div className={`loading ${props.className ? props.className : ""}`}>
    <div className="sk-three-bounce">
      <div className="sk-child sk-bounce1" />
      <div className="sk-child sk-bounce2" />
      <div className="sk-child sk-bounce3" />
    </div>
  </div>
)

const withLoading = (LoadedComponent: Class<React.Component<*, *>>) => {
  class WithLoading extends LoadedComponent {
    props: LoadingProps
    static WrappedComponent: Class<React.Component<*, *>>

    render() {
      const { loaded, errored, notAuthorized, notFound } = this.props

      if (notFound) {
        return <NotFound />
      }

      if (notAuthorized) {
        return <NotAuthorized />
      }

      if (errored) {
        return <div className="errored">Error loading page</div>
      }

      if (!loaded) {
        return <Loading />
      }

      return <div className="loaded">{super.render()}</div>
    }
  }
  WithLoading.WrappedComponent = LoadedComponent
  return WithLoading
}

export default withLoading

// @flow
import React from "react"

import { NotFound, NotAuthorized } from "../components/ErrorPages"

export type LoadingProps = {
  loaded: boolean,
  errored: boolean,
  notFound: boolean,
  notAuthorized: boolean
}

export const Spinner = () => (
  <div className="loading">
    <div className="sk-three-bounce">
      <div className="sk-child sk-bounce1" />
      <div className="sk-child sk-bounce2" />
      <div className="sk-child sk-bounce3" />
    </div>
  </div>
)

export default class Loading extends React.Component<
  LoadingProps & {
    children: any
  }
> {
  render() {
    const { loaded, errored, notAuthorized, notFound, children } = this.props

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
      return <Spinner />
    }

    return <div className="loaded">{children}</div>
  }
}

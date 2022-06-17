// @flow
import React from "react"

import { userIsAnonymous } from "../../lib/util"
import { generateLoginRedirectUrl } from "../../lib/auth"

import { Route, Redirect } from "react-router-dom"

export default function PrivateRoute({
  component: Component,
  ...routeProps
}: Object) {
  return (
    <Route
      {...routeProps}
      render={props => {
        return userIsAnonymous() ? (
          <Redirect to={generateLoginRedirectUrl()} />
        ) : (
          <Component {...props} />
        )
      }}
    />
  )
}

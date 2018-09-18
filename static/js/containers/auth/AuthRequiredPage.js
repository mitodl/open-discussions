// @flow
/* global SETTINGS: false */
import React from "react"
import { MetaTags } from "react-meta-tags"

import Card from "../../components/Card"
import CanonicalLink from "../../components/CanonicalLink"

import { formatTitle } from "../../lib/title"

import type { Match } from "react-router"

type Props = {
  match?: Match
}

export default class AuthRequiredPage extends React.Component<Props> {
  render() {
    const { match } = this.props

    return (
      <div className="auth-page auth-required-page">
        <MetaTags>
          <title>{formatTitle("Login Required")}</title>
          <CanonicalLink match={match} />
        </MetaTags>
        <div className="main-content">
          <Card className="auth-required">
            <div className="explanation">
              <i className="material-icons forum">forum</i>
              To use this site you need to log in with a MicroMasters account.
            </div>
            <div className="login">
              <a href={SETTINGS.authenticated_site.login_url}>
                Log In to MicroMasters
              </a>
            </div>
          </Card>
        </div>
      </div>
    )
  }
}

// @flow
import React from "react"

import Card from "../../components/Card"
import MetaTags from "../../components/MetaTags"

import { formatTitle } from "../../lib/title"
import { MICROMASTERS_URL, getNextParam } from "../../lib/url"

import type { Match } from "react-router"

type Props = {
  location: { search: string },
  match?: Match
}

export default class AuthRequiredPage extends React.Component<Props> {
  render() {
    const { match, location } = this.props
    const next = getNextParam(location.search)

    return (
      <div className="auth-page auth-required-page">
        <MetaTags canonicalLink={match?.url}>
          <title>{formatTitle("Login Required")}</title>
        </MetaTags>
        <div className="main-content">
          <Card className="auth-required">
            <div className="explanation">
              <i className="material-icons forum">forum</i>
              To use this site you need to log in with a MicroMasters account.
            </div>
            <div className="login">
              <a href={`${MICROMASTERS_URL}?next=${encodeURIComponent(next)}`}>
                Log In to MicroMasters
              </a>
            </div>
          </Card>
        </div>
      </div>
    )
  }
}

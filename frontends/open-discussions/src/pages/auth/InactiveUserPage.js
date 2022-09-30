// @flow
/* global SETTINGS:false */
import React from "react"

import { MetaTags, Card } from "ol-util"
import { formatTitle } from "../../lib/title"

import type { Match } from "react-router"

type Props = {
  match?: Match
}

const InactiveUserPage = ({ match }: Props) => {
  const supportEmail = SETTINGS.support_email
  return (
    <div className="auth-page inactive-account-page">
      <div className="main-content">
        <Card className="inactive-account-card">
          <h3>Log In</h3>

          <MetaTags canonicalLink={match?.url}>
            <title>{formatTitle("Account is inactive")}</title>
          </MetaTags>

          <p>
            Your account is not currently active. To fix this, please email
            support at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        </Card>
      </div>
    </div>
  )
}

export default InactiveUserPage

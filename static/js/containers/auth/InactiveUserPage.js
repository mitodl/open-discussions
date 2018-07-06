// @flow
/* global SETTINGS:false */
import React from "react"
import { MetaTags } from "react-meta-tags"

import Card from "../../components/Card"
import { formatTitle } from "../../lib/title"

const InactiveUserPage = () => {
  const supportEmail = SETTINGS.support_email
  return (
    <div className="content auth-page inactive-account-page">
      <div className="main-content">
        <Card className="inactive-account-card">
          <h3>Log In</h3>
          <MetaTags>
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

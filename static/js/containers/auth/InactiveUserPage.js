// @flow
/* global SETTINGS:false */
import React from "react"
import DocumentTitle from "react-document-title"

import Card from "../../components/Card"
import { formatTitle } from "../../lib/title"

const InactiveUserPage = () => {
  const supportEmail = SETTINGS.support_email
  return (
    <div className="content auth-page inactive-account-page">
      <div className="main-content">
        <Card className="inactive-account-card">
          s
          <h3>Log In</h3>
          <DocumentTitle title={formatTitle("Account is inactive")} />
          <p>
            Your account is not currently active, to fix this, please email
            support at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        </Card>
      </div>
    </div>
  )
}

export default InactiveUserPage

// @flow
/* global SETTINGS: false */
import React from "react"
import DocumentTitle from "react-document-title"

import Card from "../../components/Card"

import { formatTitle } from "../../lib/title"

export default class AuthRequiredPage extends React.Component<*, void> {
  render() {
    return (
      <div className="content auth-required-page">
        <DocumentTitle title={formatTitle("Login Required")} />
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

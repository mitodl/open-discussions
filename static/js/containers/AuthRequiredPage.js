// @flow
/* global SETTINGS: false */
import React from "react"
import DocumentTitle from "react-document-title"

import Card from "../components/Card"

import { formatTitle } from "../lib/title"

export default class AuthRequiredPage extends React.Component {
  render() {
    return (
      <div className="content">
        <DocumentTitle title={formatTitle("Login Required")} />
        <div className="main-content">
          <Card className="auth-required">
            <div className="explanation">
              <i className="material-icons forum">forum</i>
              MIT Open Discussions is a forum for MIT students and global
              learners. To use this site you need to log in with a MicroMasters
              account.
            </div>
            <div className="login">
              <a href={SETTINGS.external_login_url}>Log In to MicroMasters</a>
            </div>
          </Card>
        </div>
      </div>
    )
  }
}

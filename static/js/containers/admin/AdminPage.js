// @flow
import React from "react"
import { Route } from "react-router-dom"

import CreateChannelPage from "./CreateChannelPage"
import Card from "../../components/Card"

import type { Match } from "react-router"

export default class AdminPage extends React.Component {
  props: {
    match: Match
  }

  render() {
    const { match } = this.props
    return (
      <div className="content">
        <div className="main-content">
          <Card>
            <h1>Admin</h1>
            <Route path={`${match.url}/channel/new`} component={CreateChannelPage} />
          </Card>
        </div>
      </div>
    )
  }
}

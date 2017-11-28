// @flow
import React from "react"
import { Route } from "react-router-dom"

import CreateChannelPage from "./CreateChannelPage"
import EditChannelPage from "./EditChannelPage"

import type { Match } from "react-router"

export default class AdminPage extends React.Component<*, void> {
  props: {
    match: Match
  }

  render() {
    const { match } = this.props
    return (
      <div>
        <Route
          path={`${match.url}/channel/new`}
          component={CreateChannelPage}
        />
        <Route
          path={`${match.url}/channel/edit/:channelName`}
          component={EditChannelPage}
        />
      </div>
    )
  }
}

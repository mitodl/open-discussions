// @flow
import React from "react"
import { Route } from "react-router-dom"

import CreateChannelPage from "./CreateChannelPage"
import EditChannelAppearancePage from "./EditChannelAppearancePage"
import EditChannelBasicPage from "./EditChannelBasicPage"

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
          path={`${match.url}/channel/edit/basic/:channelName`}
          component={EditChannelBasicPage}
        />
        <Route
          path={`${match.url}/channel/edit/appearance/:channelName`}
          component={EditChannelAppearancePage}
        />
      </div>
    )
  }
}

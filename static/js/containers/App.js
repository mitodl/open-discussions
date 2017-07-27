// @flow
import React from "react"
import { Route } from "react-router-dom"

import HomePage from "./HomePage"
import ChannelPage from "./ChannelPage"
import PostPage from "./PostPage"

import type { Match } from "react-router"

export default class App extends React.Component {
  props: {
    match: Match
  }

  render() {
    const { match } = this.props
    return (
      <div className="app">
        <Route exact path={match.url} component={HomePage} />
        <Route exact path={`${match.url}channel/:channelName`} component={ChannelPage} />
        <Route path={`${match.url}channel/:channelName/:postID`} component={PostPage} />
      </div>
    )
  }
}

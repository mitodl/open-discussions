// @flow
import React from "react"
import { Route } from "react-router-dom"

import HomePage from "./HomePage"
import ChannelPage from "./ChannelPage"
import PostPage from "./PostPage"
import AdminPage from "./admin/AdminPage"
import CreatePostPage from "./CreatePostPage"

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
        <Route path={`${match.url}manage/`} component={AdminPage} />
        <Route path={`${match.url}create_post/:channelName`} component={CreatePostPage} />
      </div>
    )
  }
}

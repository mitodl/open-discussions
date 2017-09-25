// @flow
import React from "react"
import { Route } from "react-router-dom"
import { connect } from "react-redux"

import HomePage from "./HomePage"
import ChannelPage from "./ChannelPage"
import PostPage from "./PostPage"
import AdminPage from "./admin/AdminPage"
import CreatePostPage from "./CreatePostPage"
import Toolbar from "../components/Toolbar"
import Drawer from "../containers/Drawer"

import { actions } from "../actions"
import { setShowDrawer } from "../actions/ui"
import { setChannelData } from "../actions/channel"

import type { Match } from "react-router"
import type { Dispatch } from "redux"

class App extends React.Component {
  props: {
    match: Match,
    showDrawer: boolean,
    dispatch: Dispatch
  }

  toggleShowSidebar = () => {
    const { dispatch, showDrawer } = this.props
    dispatch(setShowDrawer(!showDrawer))
  }

  componentWillMount() {
    this.loadData()
  }

  loadData = async () => {
    const { dispatch } = this.props
    const channels = await dispatch(actions.subscribedChannels.get())
    dispatch(setChannelData(channels))
  }

  render() {
    const { match } = this.props
    return (
      <div className="app">
        <Toolbar toggleShowSidebar={this.toggleShowSidebar} />
        <Drawer />
        <Route exact path={match.url} component={HomePage} />
        <Route
          exact
          path={`${match.url}channel/:channelName`}
          component={ChannelPage}
        />
        <Route
          path={`${match.url}channel/:channelName/:postID`}
          component={PostPage}
        />
        <Route path={`${match.url}manage/`} component={AdminPage} />
        <Route
          path={`${match.url}create_post/:channelName?`}
          component={CreatePostPage}
        />
      </div>
    )
  }
}

export default connect(state => {
  const { ui: { showDrawer } } = state
  return { showDrawer }
})(App)

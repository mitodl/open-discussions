// @flow
import React from "react"
import { Route } from "react-router-dom"
import { connect } from "react-redux"
import DocumentTitle from "react-document-title"

import HomePage from "./HomePage"
import ChannelPage from "./ChannelPage"
import PostPage from "./PostPage"
import AdminPage from "./admin/AdminPage"
import AuthRequiredPage from "./AuthRequiredPage"
import CreatePostPage from "./CreatePostPage"
import Toolbar from "../components/Toolbar"
import Drawer from "../containers/Drawer"

import { actions } from "../actions"
import { setShowDrawer } from "../actions/ui"
import { setChannelData } from "../actions/channel"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"

class App extends React.Component {
  props: {
    match: Match,
    location: Location,
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
    const { dispatch, location: { pathname } } = this.props

    if (pathname === "/auth_required/") {
      return
    }

    const channels = await dispatch(actions.subscribedChannels.get())
    dispatch(setChannelData(channels))
  }

  render() {
    const { match } = this.props
    return (
      <div className="app">
        <DocumentTitle title="MIT Open Discussions" />
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
        <Route
          path={`${match.url}auth_required/`}
          component={AuthRequiredPage}
        />
      </div>
    )
  }
}

export default connect(state => {
  const { ui: { showDrawer } } = state
  return { showDrawer }
})(App)

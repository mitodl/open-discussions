/* global SETTINGS: false */
// @flow
import React from "react"
import { Route, Redirect } from "react-router-dom"
import { connect } from "react-redux"
import DocumentTitle from "react-document-title"

import HomePage from "./HomePage"
import ChannelPage from "./ChannelPage"
import PostPage from "./PostPage"
import ContentPolicyPage from "./ContentPolicyPage"
import AdminPage from "./admin/AdminPage"
import AuthRequiredPage from "./AuthRequiredPage"
import CreatePostPage from "./CreatePostPage"
import Toolbar from "../components/Toolbar"
import Snackbar from "../components/material/Snackbar"
import Drawer from "../containers/Drawer"
import Footer from "../components/Footer"

import { actions } from "../actions"
import { setShowDrawer } from "../actions/ui"
import { setChannelData } from "../actions/channel"
import { AUTH_REQUIRED_URL } from "../lib/url"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type { SnackbarState } from "../reducers/ui"

class App extends React.Component<*, void> {
  props: {
    match: Match,
    location: Location,
    showDrawer: boolean,
    snackbar: SnackbarState,
    dispatch: Dispatch
  }

  toggleShowSidebar = () => {
    const { dispatch, showDrawer } = this.props
    dispatch(setShowDrawer(!showDrawer))
  }

  componentWillMount() {
    const { location: { pathname } } = this.props
    if (pathname === AUTH_REQUIRED_URL || !SETTINGS.session_url) {
      // either user is at auth required page
      // or they will be soon redirected there due to missing session_url
      return
    }

    this.loadData()
  }

  loadData = async () => {
    const { dispatch } = this.props

    const channels = await dispatch(actions.subscribedChannels.get())
    dispatch(setChannelData(channels))
  }

  render() {
    const { match, location: { pathname }, snackbar } = this.props

    if (!SETTINGS.session_url && pathname !== AUTH_REQUIRED_URL) {
      // user does not have the jwt cookie, they must go through login workflow first
      return <Redirect to={AUTH_REQUIRED_URL} />
    }

    return (
      <div>
        <div className="app">
          <DocumentTitle title="MIT Open Discussions" />
          <Snackbar snackbar={snackbar} />
          <Toolbar toggleShowSidebar={this.toggleShowSidebar} />
          <Drawer />
          <Route exact path={match.url} component={HomePage} />
          <Route
            exact
            path={`${match.url}channel/:channelName`}
            component={ChannelPage}
          />
          <Route
            exact
            path={`${match.url}channel/:channelName/:postID`}
            component={PostPage}
          />
          <Route
            exact
            path={`${match.url}channel/:channelName/:postID/comment/:commentID`}
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
          <Route
            path={`${match.url}content_policy/`}
            component={ContentPolicyPage}
          />
        </div>
        <Footer />
      </div>
    )
  }
}

export default connect(state => {
  const { ui: { showDrawer, snackbar } } = state
  return { showDrawer, snackbar }
})(App)

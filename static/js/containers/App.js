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
import AuthRequiredPage from "./auth/AuthRequiredPage"
import CreatePostPage from "./CreatePostPage"
import ChannelModerationPage from "./ChannelModerationPage"
import SettingsPage from "./SettingsPage"
import LoginPage from "./auth/LoginPage"
import LoginPasswordPage from "./auth/LoginPasswordPage"
import RegisterPage from "./auth/RegisterPage"
import RegisterConfirmPage from "./auth/RegisterConfirmPage"
import RegisterDetailsPage from "./auth/RegisterDetailsPage"
import InactiveUserPage from "./auth/InactiveUserPage"
import Toolbar from "../components/Toolbar"
import Snackbar from "../components/material/Snackbar"
import Drawer from "../containers/Drawer"
import Footer from "../components/Footer"

import { actions } from "../actions"
import { setShowDrawer, setShowUserMenu } from "../actions/ui"
import { setChannelData } from "../actions/channel"
import { AUTH_REQUIRED_URL, SETTINGS_URL } from "../lib/url"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type { SnackbarState } from "../reducers/ui"

class App extends React.Component<*, void> {
  props: {
    match: Match,
    location: Location,
    showDrawer: boolean,
    snackbar: SnackbarState,
    dispatch: Dispatch,
    showUserMenu: boolean
  }

  toggleShowSidebar = () => {
    const { dispatch, showDrawer } = this.props
    dispatch(setShowDrawer(!showDrawer))
  }

  toggleShowUserMenu = () => {
    const { dispatch, showUserMenu } = this.props
    dispatch(setShowUserMenu(!showUserMenu))
  }

  componentDidMount() {
    const {
      location: { pathname }
    } = this.props
    if (pathname === AUTH_REQUIRED_URL || pathname.startsWith(SETTINGS_URL)) {
      // user is at auth required page or settings page
      return
    }

    if (!SETTINGS.authenticated_site.session_url && !SETTINGS.allow_anonymous) {
      // user will be redirected to login required page due to missing session_url
      // if anonymous access is not allowed
      return
    }

    this.loadData()
  }

  componentDidUpdate(prevProps) {
    const {
      location: { pathname }
    } = this.props

    if (
      !pathname.startsWith(SETTINGS_URL) &&
      prevProps.location.pathname.startsWith(SETTINGS_URL)
    ) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { dispatch } = this.props

    const channels = await dispatch(actions.subscribedChannels.get())
    dispatch(setChannelData(channels))
  }

  render() {
    const {
      match,
      location: { pathname },
      snackbar,
      showUserMenu
    } = this.props

    if (
      !SETTINGS.authenticated_site.session_url &&
      pathname !== AUTH_REQUIRED_URL &&
      !pathname.startsWith(SETTINGS_URL) &&
      !SETTINGS.allow_anonymous
    ) {
      // user does not have the jwt cookie, they must go through login workflow first
      return <Redirect to={AUTH_REQUIRED_URL} />
    }

    return (
      <div>
        <div className="app">
          <DocumentTitle title="MIT Open Discussions" />
          <Snackbar snackbar={snackbar} />
          <Toolbar
            toggleShowSidebar={this.toggleShowSidebar}
            toggleShowUserMenu={this.toggleShowUserMenu}
            showUserMenu={showUserMenu}
          />
          <Drawer />
          <Route exact path={match.url} component={HomePage} />
          <Route
            path={`${match.url}moderation/channel/:channelName`}
            component={ChannelModerationPage}
          />
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
          <Route
            exact
            path={`${match.url}settings/:token?`}
            component={SettingsPage}
          />
          <Route exact path={`${match.url}login/`} component={LoginPage} />
          <Route
            exact
            path={`${match.url}login/password/`}
            component={LoginPasswordPage}
          />
          <Route
            exact
            path={`${match.url}register/`}
            component={RegisterPage}
          />
          <Route
            exact
            path={`${match.url}register/confirm/`}
            component={RegisterConfirmPage}
          />
          <Route
            exact
            path={`${match.url}register/details/`}
            component={RegisterDetailsPage}
          />
          <Route
            exact
            path={`${match.url}account/inactive/`}
            component={InactiveUserPage}
          />
        </div>
        <Footer />
      </div>
    )
  }
}

export default connect(state => {
  const {
    ui: { showDrawer, snackbar, showUserMenu }
  } = state
  return { showDrawer, snackbar, showUserMenu }
})(App)

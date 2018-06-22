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
import ChannelModerationPage from "./ChannelModerationPage"
import SettingsPage from "./SettingsPage"
import ProfilePage from "./ProfilePage"
import ProfileEditPage from "./ProfileEditPage"
import Snackbar from "../components/material/Snackbar"
import Drawer from "../containers/Drawer"
import Toolbar from "../components/Toolbar"
import Footer from "../components/Footer"

import { actions } from "../actions"
import {
  setShowDrawerMobile,
  setShowDrawerDesktop,
  setShowUserMenu
} from "../actions/ui"
import { setChannelData } from "../actions/channel"
import { AUTH_REQUIRED_URL, SETTINGS_URL } from "../lib/url"
import { isMobileWidth } from "../lib/util"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type { SnackbarState } from "../reducers/ui"
import type { Profile } from "../flow/discussionTypes"

class App extends React.Component<*, void> {
  props: {
    match: Match,
    location: Location,
    showDrawerDesktop: boolean,
    showDrawerMobile: boolean,
    snackbar: SnackbarState,
    dispatch: Dispatch<*>,
    showUserMenu: boolean,
    profile: Profile
  }

  toggleShowDrawer = () => {
    const { dispatch, showDrawerMobile, showDrawerDesktop } = this.props
    dispatch(
      isMobileWidth()
        ? setShowDrawerMobile(!showDrawerMobile)
        : setShowDrawerDesktop(!showDrawerDesktop)
    )
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
      location: { pathname },
      showDrawerMobile
    } = this.props

    if (
      !pathname.startsWith(SETTINGS_URL) &&
      prevProps.location.pathname.startsWith(SETTINGS_URL)
    ) {
      this.loadData()
    }

    if (
      pathname !== prevProps.location.pathname &&
      showDrawerMobile &&
      isMobileWidth()
    ) {
      this.toggleShowDrawer()
    }
  }

  loadData = async () => {
    const { dispatch } = this.props

    const channels = await dispatch(actions.subscribedChannels.get())
    dispatch(setChannelData(channels))
    if (SETTINGS.username) {
      await dispatch(actions.profiles.get(SETTINGS.username))
    }
  }

  render() {
    const {
      match,
      location: { pathname },
      snackbar,
      showUserMenu,
      profile
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
      <div className="app">
        <DocumentTitle title="MIT Open Discussions" />
        <Snackbar snackbar={snackbar} />
        <Toolbar
          toggleShowDrawer={this.toggleShowDrawer}
          toggleShowUserMenu={this.toggleShowUserMenu}
          showUserMenu={showUserMenu}
          profile={profile}
        />
        <Drawer />
        <div className="content">
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
          <Route
            exact
            path={`${match.url}profile/:userName/edit`}
            component={ProfileEditPage}
          />
          <Route
            exact
            path={`${match.url}profile/:userName`}
            component={ProfilePage}
          />
          <Footer />
        </div>
      </div>
    )
  }
}

export default connect(state => {
  const {
    profiles,
    ui: { showDrawerMobile, showDrawerDesktop, snackbar, showUserMenu }
  } = state
  const profile = SETTINGS.username
    ? profiles.data.get(SETTINGS.username)
    : null
  return {
    showDrawerMobile,
    showDrawerDesktop,
    snackbar,
    showUserMenu,
    profile
  }
})(App)

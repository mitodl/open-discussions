/* global SETTINGS: false */
// @flow
import React from "react"
import { Route, Redirect, Switch } from "react-router-dom"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import qs from "query-string"

import HomePage from "./HomePage"
import ChannelPage from "./ChannelPage"
import PostPage from "./PostPage"
import ContentPolicyPage from "./ContentPolicyPage"
import AdminPage from "./admin/AdminPage"
import AuthRequiredPage from "./auth/AuthRequiredPage"
import CreatePostPage from "./CreatePostPage"
import SettingsPage from "./SettingsPage"
import AccountSettingsPage from "./AccountSettingsPage"
import PasswordChangePage from "./PasswordChangePage"
import ProfilePage from "./ProfilePage"
import ProfileEditPage from "./ProfileEditPage"
import LoginPage from "./auth/LoginPage"
import LoginPasswordPage from "./auth/LoginPasswordPage"
import LoginProviderRequiredPage from "./auth/LoginProviderRequiredPage"
import RegisterPage from "./auth/RegisterPage"
import RegisterConfirmPage from "./auth/RegisterConfirmPage"
import RegisterDetailsPage from "./auth/RegisterDetailsPage"
import InactiveUserPage from "./auth/InactiveUserPage"
import PasswordResetPage from "./auth/PasswordResetPage"
import PasswordResetConfirmPage from "./auth/PasswordResetConfirmPage"
import Snackbar from "../components/material/Snackbar"
import Banner from "../components/material/Banner"
import Drawer from "../containers/Drawer"
import Toolbar from "../components/Toolbar"

import { actions } from "../actions"
import {
  setShowDrawerMobile,
  setShowDrawerDesktop,
  showDropdown,
  hideDropdown,
  setBannerMessage,
  hideBanner
} from "../actions/ui"
import { setChannelData } from "../actions/channel"
import { AUTH_REQUIRED_URL, SETTINGS_URL } from "../lib/url"
import { isAnonAccessiblePath, needsAuthedSite } from "../lib/auth"
import { isMobileWidth, preventDefaultAndInvoke } from "../lib/util"
import { getOwnProfile } from "../lib/redux_selectors"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type { SnackbarState, BannerState } from "../reducers/ui"
import type { Profile } from "../flow/discussionTypes"

export const USER_MENU_DROPDOWN = "USER_MENU_DROPDOWN"

type AppProps = {
  match: Match,
  location: Location,
  showDrawerDesktop: boolean,
  showDrawerMobile: boolean,
  snackbar: SnackbarState,
  banner: BannerState,
  dispatch: Dispatch<*>,
  showUserMenu: boolean,
  profile: Profile
}

class App extends React.Component<AppProps> {
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

    dispatch(
      showUserMenu
        ? hideDropdown(USER_MENU_DROPDOWN)
        : showDropdown(USER_MENU_DROPDOWN)
    )
  }

  componentDidMount() {
    const {
      location: { pathname }
    } = this.props
    if (needsAuthedSite() || isAnonAccessiblePath(pathname)) {
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
    // wait to show messages
    await this.showMessages()
  }

  showMessages = async () => {
    const {
      dispatch,
      location: { search }
    } = this.props
    const params = qs.parse(search)
    if (params.message) {
      await dispatch(setBannerMessage(params.message))
    }
  }

  hideBanner = () => {
    const { dispatch } = this.props

    dispatch(hideBanner())
  }

  render() {
    const {
      match,
      location: { pathname },
      snackbar,
      banner,
      showUserMenu,
      profile
    } = this.props

    if (needsAuthedSite() && !isAnonAccessiblePath(pathname)) {
      return <Redirect to={AUTH_REQUIRED_URL} />
    }

    return (
      <div className="app">
        <MetaTags>
          <title>MIT Open Discussions</title>
        </MetaTags>
        <Toolbar
          toggleShowDrawer={this.toggleShowDrawer}
          toggleShowUserMenu={this.toggleShowUserMenu}
          showUserMenu={showUserMenu}
          profile={profile}
        />
        <Drawer />
        <Snackbar snackbar={snackbar} />
        <Banner
          banner={banner}
          hide={preventDefaultAndInvoke(this.hideBanner)}
        />
        <div className="content">
          <Route exact path={match.url} component={HomePage} />
          <Route
            exact
            path={`${match.url}c/:channelName`}
            component={ChannelPage}
          />
          <Route
            exact
            path={`${match.url}c/:channelName/:postID/:postSlug?`}
            component={PostPage}
          />
          <Route
            exact
            path={`${
              match.url
            }c/:channelName/:postID/:postSlug?/comment/:commentID`}
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
          <Switch>
            <Route
              exact
              path={`${match.url}settings/notifications`}
              component={SettingsPage}
            />
            <Route
              exact
              path={`${match.url}settings/account`}
              component={AccountSettingsPage}
            />
            <Route
              exact
              path={`${match.url}settings/password`}
              component={PasswordChangePage}
            />
            <Route
              exact
              path={`${match.url}settings/:token?`}
              component={SettingsPage}
            />
          </Switch>
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
          <Route exact path={`${match.url}login/`} component={LoginPage} />
          <Route
            exact
            path={`${match.url}login/password/`}
            component={LoginPasswordPage}
          />
          <Route
            exact
            path={`${match.url}login/external/`}
            component={LoginProviderRequiredPage}
          />
          <Route exact path={`${match.url}signup/`} component={RegisterPage} />
          <Route
            exact
            path={`${match.url}signup/confirm/`}
            component={RegisterConfirmPage}
          />
          <Route
            exact
            path={`${match.url}signup/details/`}
            component={RegisterDetailsPage}
          />
          <Route
            exact
            path={`${match.url}account/inactive/`}
            component={InactiveUserPage}
          />
          <Route
            exact
            path={`${match.url}password_reset/`}
            component={PasswordResetPage}
          />
          <Route
            exact
            path={`${match.url}password_reset/confirm/:uid/:token`}
            component={PasswordResetConfirmPage}
          />
        </div>
      </div>
    )
  }
}

export default connect(state => {
  const {
    ui: { showDrawerMobile, showDrawerDesktop, snackbar, banner, dropdownMenus }
  } = state

  const showUserMenu = dropdownMenus.has(USER_MENU_DROPDOWN)

  return {
    showDrawerMobile,
    showDrawerDesktop,
    snackbar,
    banner,
    showUserMenu,
    profile: getOwnProfile(state)
  }
})(App)

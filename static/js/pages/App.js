// @flow
/* global SETTINGS: false */
import React from "react"
import { Route, Redirect, Switch, useLocation } from "react-router-dom"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import qs from "query-string"

import HomePage from "./HomePage"
import SearchPage from "./SearchPage"
import ContentPolicyPage from "./policies/ContentPolicyPage"
import PrivacyPolicyPage from "./policies/PrivacyPolicyPage"
import TermsOfServicePage from "./policies/TermsOfServicePage"
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
import ChannelRouter from "./ChannelRouter"
import LearnRouter from "./LearnRouter"
import PodcastFrontpage from "./PodcastFrontpage"

import PrivateRoute from "../components/auth/PrivateRoute"
import Snackbar from "../components/material/Snackbar"
import Banner from "../components/material/Banner"
import Drawer from "../components/Drawer"
import Toolbar from "../components/Toolbar"
import ContentToolbar from "../components/ContentToolbar"

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
import { POSTS_OBJECT_TYPE, COMMENTS_OBJECT_TYPE } from "../lib/constants"
import { channelIndexRoute } from "../lib/routing"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type { SnackbarState, BannerState } from "../reducers/ui"
import type { Profile } from "../flow/discussionTypes"

export const USER_MENU_DROPDOWN = "USER_MENU_DROPDOWN"

type StateProps = {|
  showDrawerDesktop: boolean,
  showDrawerMobile: boolean,
  snackbar: SnackbarState,
  banner: BannerState,
  showUserMenu: boolean,
  profile: ?Profile
|}

type OwnProps = {|
  match: Match,
  location: Location
|}

type Props = {|
  ...StateProps,
  ...OwnProps,
  dispatch: Dispatch<*>
|}

function CourseLearnRedirect() {
  const { pathname, search } = useLocation()

  const newPath = pathname.replace(/^\/courses/, "/learn").concat(search)

  return <Redirect to={newPath} />
}

class App extends React.Component<Props> {
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

  componentDidUpdate(prevProps: Props) {
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
          <title>MIT Open Learning</title>
        </MetaTags>
        <Route path={[`${match.url}learn/`, `${match.url}podcasts/`]}>
          {({ match }) =>
            match ? (
              <ContentToolbar
                toggleShowUserMenu={this.toggleShowUserMenu}
                showUserMenu={showUserMenu}
                profile={profile}
              />
            ) : (
              <React.Fragment>
                <Toolbar
                  toggleShowDrawer={this.toggleShowDrawer}
                  toggleShowUserMenu={this.toggleShowUserMenu}
                  showUserMenu={showUserMenu}
                  profile={profile}
                />
                <Drawer />
              </React.Fragment>
            )
          }
        </Route>
        <Snackbar snackbar={snackbar} />
        <Banner
          banner={banner}
          hide={preventDefaultAndInvoke(this.hideBanner)}
        />
        <div className="content">
          <Route exact path={match.url} component={HomePage} />
          <Route
            path={channelIndexRoute(match.url)}
            component={ChannelRouter}
          />
          <Route path={`${match.url}manage/`} component={AdminPage} />
          <PrivateRoute
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
          <Route path={`${match.url}search/`} component={SearchPage} />
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
            path={`${
              match.url
            }profile/:userName/:objectType(${POSTS_OBJECT_TYPE}|${COMMENTS_OBJECT_TYPE})?`}
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
          <Route
            exact
            path={`${match.url}terms-and-conditions`}
            component={TermsOfServicePage}
          />
          <Route
            exact
            path={`${match.url}privacy-statement`}
            component={PrivacyPolicyPage}
          />
          {SETTINGS.course_ui_enabled ? (
            <>
              <Route path={`${match.url}courses`}>
                <CourseLearnRedirect />
              </Route>
              <Route path={`${match.url}learn`} component={LearnRouter} />
            </>
          ) : null}
          {SETTINGS.podcast_frontpage_enabled ? (
            <Route path={`${match.url}podcasts`}>
              <PodcastFrontpage />
            </Route>
          ) : null}
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => {
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
}

export default connect<Props, OwnProps, _, _, _, _>(mapStateToProps)(App)

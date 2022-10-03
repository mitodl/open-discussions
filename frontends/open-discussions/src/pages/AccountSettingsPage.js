// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { Link } from "react-router-dom"

import { MetaTags, Card } from "ol-util"
import SettingsTabs from "../components/SettingsTabs"

import { actions } from "../actions"
import { formatTitle } from "../lib/title"

import type { Match } from "react-router"
import type { SocialAuth } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

type OwnProps = {|
  match: Match
|}

type StateProps = {|
  socialAuths: Array<SocialAuth>
|}

type Props = {|
  ...StateProps,
  ...OwnProps,
  dispatch: Dispatch<*>
|}

class AccountSettingsPage extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  loadData = async () => {
    const { dispatch } = this.props

    try {
      await dispatch(actions.accountSettings.get())
    } catch (_) {} // eslint-disable-line no-empty
  }

  renderSocialAuthLine = (socialAuth: SocialAuth, index: number) => {
    switch (socialAuth.provider) {
    case "email":
      return (
        <div key={index} className="account-settings-row">
          <h5>MIT Open</h5>
          <Link to="/settings/password">Change Password</Link>
        </div>
      )
    case "micromasters":
      return (
        <div key={index} className="account-settings-row">
          <h5>MicroMasters</h5>
        </div>
      )
    case "saml":
      return (
        <div key={index} className="account-settings-row">
          <h5 className="touchstone-text-logo">
              Touchstone<span className="ampersand">@</span>MIT
          </h5>
        </div>
      )
    default:
      return null
    }
  }

  render() {
    const { socialAuths, match } = this.props

    return (
      <React.Fragment>
        <MetaTags canonicalLink={match?.url}>
          <title>{formatTitle("Account Settings")}</title>
        </MetaTags>
        <div className="main-content settings-page">
          <SettingsTabs />
          <Card>
            <label>
              You're logged in as
              <span className="highlight"> {SETTINGS.user_full_name} </span>
              using:
            </label>
            {R.compose(
              R.addIndex(R.map)(this.renderSocialAuthLine),
              // Show email auth before any other social auths
              R.sortBy(auth => (auth.provider === "email" ? 0 : 1))
            )(socialAuths)}
          </Card>
        </div>
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state: Object): StateProps => {
  const socialAuths = state.accountSettings.data || []

  return { socialAuths }
}

export default connect<Props, OwnProps, _, _, _, _>(mapStateToProps)(
  AccountSettingsPage
)

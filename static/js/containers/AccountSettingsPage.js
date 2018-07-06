// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import { Link } from "react-router-dom"

import Card from "../components/Card"
import SettingsTabs from "../components/SettingsTabs"

import { actions } from "../actions"
import { formatTitle } from "../lib/title"

import type { SocialAuth } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

type Props = {
  dispatch: Dispatch<*>,
  socialAuths: Array<SocialAuth>
}

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
        <div key={index}>
          <h4>MIT Open</h4>
          <div className="account-settings-row">
            <div className="email">{socialAuth.email}</div>
            <div className="action">
              <Link to="/settings/password">Change Password</Link>
            </div>
          </div>
        </div>
      )
    case "micromasters":
      return (
        <div key={index}>
          <h4>MicroMasters</h4>
          <div className="account-settings-row">
            <div className="email">{socialAuth.email}</div>
          </div>
        </div>
      )
    default:
      return null
    }
  }

  render() {
    const { socialAuths } = this.props

    return (
      <div className="content">
        <MetaTags>
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
              R.sortBy(x => (x.provider === "email" ? 0 : 1))
            )(socialAuths)}
          </Card>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => {
  const socialAuths = state.accountSettings.data || []

  return { socialAuths }
}

export default connect(mapStateToProps)(AccountSettingsPage)

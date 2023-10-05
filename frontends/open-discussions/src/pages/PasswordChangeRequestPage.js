// @flow
/* global SETTINGS:false */
import React from "react"
import MetaTags from "../components/MetaTags"
import { formatTitle } from "../lib/title"
import { actions } from "../actions"
import type { Dispatch } from "redux"
import { connect } from "react-redux"
import { Redirect } from "react-router"
import { LOGIN_URL } from "../lib/url"

type Props = {|
  ...OwnProps,
  ...StateProps,
  dispatch: Dispatch<*>
|}

class PasswordChangeRequestPage extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  loadData = async () => {
    const { dispatch } = this.props
    if (SETTINGS.is_authenticated && SETTINGS.user_id) {
      try {
        await dispatch(actions.passwordChangeRequest.post(SETTINGS.user_id))
      } catch (e_) {} // eslint-disable-line no-empty
    }
  }

  render() {
    const { match } = this.props
    console.log(SETTINGS)

    return SETTINGS.isAuthenticated && SETTINGS.user_id ? (
      <React.Fragment>
        <MetaTags canonicalLink={match?.url}>
          <title>{formatTitle(`Request password change`)}</title>
        </MetaTags>
        <h1>Password change email sent.</h1>
      </React.Fragment>
    ) : (
      <React.Fragment>
        <MetaTags canonicalLink={match?.url}>
          <title>{formatTitle(`Request password change`)}</title>
        </MetaTags>
        <h1>You must login first.</h1>
        <a href={LOGIN_URL}>Log In</a>
      </React.Fragment>
    )
  }
}

export default connect<Props, _, _, _, _, _>()(PasswordChangeRequestPage)

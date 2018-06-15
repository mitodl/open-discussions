// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import DocumentTitle from "react-document-title"
import qs from "query-string"
import { Link } from "react-router-dom"

import Card from "../../components/Card"
import { Loading } from "../../components/Loading"

import { actions } from "../../actions"
import { processAuthResponse, STATE_INVALID_EMAIL } from "../../lib/auth"
import { formatTitle } from "../../lib/title"
import { REGISTER_URL } from "../../lib/url"

type RegisterConfirmPageProps = {
  confirmCode: Function,
  location: Object,
  history: Object,
  invalid: boolean
}

const onResult = R.curry(processAuthResponse)

const confirmationCodeFromLocation = R.compose(
  R.propOr(null, "verification_code"),
  qs.parse,
  R.propOr("", "search")
)

const isInvalid = R.pathEq(["data", "state"], STATE_INVALID_EMAIL)

export class RegisterConfirmPage extends React.Component<*, *> {
  props: RegisterConfirmPageProps

  componentDidMount() {
    const { confirmCode, location, history } = this.props
    const code = confirmationCodeFromLocation(location)
    if (code) {
      confirmCode(code).then(onResult(history))
    }
  }
  render() {
    const { location, invalid } = this.props

    const code = confirmationCodeFromLocation(location)
    const showLoading = code && !invalid

    return (
      <div className="content auth-page register-confirm-page">
        <div className="main-content">
          <Card className="register-confirm-card">
            <h3>Confirming Email</h3>
            <DocumentTitle title={formatTitle("Confirming Email")} />
            {showLoading ? (
              <Loading />
            ) : (
              <div>
                <p>No confirmation code was provided or it has expired.</p>
                <p>
                  <Link to={REGISTER_URL}>Click here</Link> to register again.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    )
  }
}

const confirmCode = (code: string) => actions.auth.registerConfirm(code)

const mapStateToProps = state => {
  const invalid = isInvalid(state.auth)
  return {
    invalid
  }
}

export default connect(
  mapStateToProps,
  {
    confirmCode
  }
)(RegisterConfirmPage)

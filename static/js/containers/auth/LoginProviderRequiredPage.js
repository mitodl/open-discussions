// @flow
import React from "react"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import Card from "../../components/Card"
import { formatTitle } from "../../lib/title"
import { getAuthProviderSelector } from "../../reducers/auth"

type LoginProviderRequiredPageProps = {
  provider: string
}

const getProviderLabel = (provider: string) => {
  switch (provider) {
  case "micromasters":
    return "MicroMasters"
  default:
    return null
  }
}

export const LoginProviderRequiredPage = ({
  provider
}: LoginProviderRequiredPageProps) => (
  <div className="content auth-page login-provider-page">
    <div className="main-content">
      <Card className="login-provider-card">
        <h3>Welcome Back!</h3>
        <MetaTags>
          <title>{formatTitle("Welcome Back!")}</title>
        </MetaTags>
        <p>You already have a login with</p>
        <a href={`/login/${provider}/`} className="link-button">
          {getProviderLabel(provider)}
        </a>
      </Card>
    </div>
  </div>
)

const mapStateToProps = state => {
  const provider = getAuthProviderSelector(state)
  return { provider }
}

export default connect(mapStateToProps)(LoginProviderRequiredPage)

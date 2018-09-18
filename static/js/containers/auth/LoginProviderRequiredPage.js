// @flow
import React from "react"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import R from "ramda"

import Card from "../../components/Card"
import TouchstoneLoginButton from "../../components/auth/TouchstoneLoginButton"
import LoginGreeting from "../../components/auth/LoginGreeting"
import { NotFound } from "../../components/ErrorPages"
import CanonicalLink from "../../components/CanonicalLink"

import { formatTitle } from "../../lib/title"
import { getAuthProviderSelector } from "../../reducers/auth"
import {
  getAuthUiNameSelector,
  getAuthUiEmailSelector,
  getAuthUiImgSelector
} from "../../reducers/ui"
import { goToFirstLoginStep } from "../../lib/auth"
import { preventDefaultAndInvoke } from "../../lib/util"

import type { Match } from "react-router"

type LoginProviderRequiredPageProps = {
  match: Match,
  history: Object,
  provider: string,
  email: string,
  name: string,
  profileImageUrl: string
}

const renderExternalProviderLink = (provider: string) => {
  switch (provider) {
  case "micromasters":
    return (
      <a href={`/login/${provider}/`} className="link-button">
          MicroMasters
      </a>
    )
  case "saml":
    return (
      <div className="actions row">
        <TouchstoneLoginButton />
      </div>
    )
  default:
    return null
  }
}

export const LoginProviderRequiredPage = ({
  history,
  provider,
  email,
  name,
  profileImageUrl,
  match
}: LoginProviderRequiredPageProps) => {
  const externalLink = renderExternalProviderLink(provider)
  if (!externalLink) {
    return (
      <div className="auth-page">
        <div className="main-content">
          <NotFound />
        </div>
      </div>
    )
  }

  const onBackButtonClick = preventDefaultAndInvoke(
    R.partial(goToFirstLoginStep, [history])
  )

  return (
    <div className="auth-page login-provider-page">
      <div className="main-content">
        <Card className="login-provider-card">
          <MetaTags>
            <title>{formatTitle("Welcome Back!")}</title>
            <CanonicalLink match={match} />
          </MetaTags>
          <LoginGreeting
            email={email}
            name={name}
            profileImageUrl={profileImageUrl}
            onBackButtonClick={onBackButtonClick}
          />
          <p>You already have a login with</p>
          {externalLink}
        </Card>
      </div>
    </div>
  )
}

const mapStateToProps = state => {
  const provider = getAuthProviderSelector(state)
  const email = getAuthUiEmailSelector(state)
  const name = getAuthUiNameSelector(state)
  const profileImageUrl = getAuthUiImgSelector(state)
  return {
    provider,
    email,
    name,
    profileImageUrl
  }
}

export default connect(mapStateToProps)(LoginProviderRequiredPage)

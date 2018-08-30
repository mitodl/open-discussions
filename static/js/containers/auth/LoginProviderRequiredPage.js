// @flow
import React from "react"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import Card from "../../components/Card"
import TouchstoneLoginButton from "../../components/auth/TouchstoneLoginButton"
import LoginGreeting from "../../components/auth/LoginGreeting"
import { NotFound } from "../../components/ErrorPages"

import { formatTitle } from "../../lib/title"
import { getAuthProviderSelector } from "../../reducers/auth"
import {
  getAuthUiNameSelector,
  getAuthUiEmailSelector,
  getAuthUiImgSelector
} from "../../reducers/ui"

type LoginProviderRequiredPageProps = {
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
    return <TouchstoneLoginButton />
  default:
    return null
  }
}

export const LoginProviderRequiredPage = ({
  provider,
  email,
  name,
  profileImageUrl
}: LoginProviderRequiredPageProps) => {
  const externalLink = renderExternalProviderLink(provider)
  if (!externalLink) {
    return <NotFound />
  }

  return (
    <div className="content auth-page login-provider-page">
      <div className="main-content">
        <Card className="login-provider-card">
          <MetaTags>
            <title>{formatTitle("Welcome Back!")}</title>
          </MetaTags>
          <LoginGreeting
            email={email}
            name={name}
            profileImageUrl={profileImageUrl}
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

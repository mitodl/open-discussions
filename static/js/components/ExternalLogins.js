// @flow
/* global SETTINGS:false */
import React from "react"

import TouchstoneLoginButton from "./auth/TouchstoneLoginButton"

type ExternalLoginProps = {
  className?: string
}

const ExternalLogins = ({ className }: ExternalLoginProps) =>
  SETTINGS.allow_saml_auth ? (
    <div className={`actions row ${className || ""}`}>
      <div className="textline">Or</div>
      <TouchstoneLoginButton />
    </div>
  ) : null

export default ExternalLogins

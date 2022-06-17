// @flow
/* global SETTINGS:false */
import React from "react"

import TouchstoneLoginButton from "./auth/TouchstoneLoginButton"

type ExternalLoginProps = {
  className?: string,
  next?: string
}

const ExternalLogins = ({ className, next }: ExternalLoginProps) =>
  SETTINGS.allow_saml_auth ? (
    <div className={`actions row ${className || ""}`}>
      <div className="textline">Or</div>
      <TouchstoneLoginButton next={next} />
    </div>
  ) : null

export default ExternalLogins

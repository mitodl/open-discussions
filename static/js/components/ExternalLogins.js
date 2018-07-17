// @flow
/* global SETTINGS:false */
import React from "react"
import { TOUCHSTONE_URL } from "../lib/url"

type ExternalLoginProps = {
  className?: string
}

const ExternalLogins = ({ className }: ExternalLoginProps) =>
  SETTINGS.allow_saml_auth ? (
    <div className={`actions row ${className || ""}`}>
      <div className="textline">Or use</div>
      <a className="link-button" href={TOUCHSTONE_URL}>
        Touchstone
        <span className="ampersand">@</span>
        MIT
      </a>
    </div>
  ) : null

export default ExternalLogins

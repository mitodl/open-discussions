// @flow
import React from "react"
import { TOUCHSTONE_URL } from "../lib/url"

type ExternalLoginProps = {
  className?: string
}

const ExternalLogins = ({ className }: ExternalLoginProps) => (
  <div className={`actions row ${className || ""}`}>
    <a className="link-button" href={TOUCHSTONE_URL}>
      Touchstone
      <span className="ampersand">@</span>
      MIT
    </a>
  </div>
)

export default ExternalLogins

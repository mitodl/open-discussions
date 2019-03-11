// @flow
/* global SETTINGS: false */
import React from "react"

const MITLogoLink = () => (
  <a href="http://www.mit.edu" className="mitlogo">
    <img
      src={`/static/images/${
        SETTINGS.use_new_branding
          ? "MIT_circle.svg"
          : "mit-logo-transparent3.svg"
      }`}
    />
  </a>
)

export default MITLogoLink

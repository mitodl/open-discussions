// @flow
/* global SETTINGS:false */
import React from "react"

import { TOUCHSTONE_URL } from "../../lib/url"

const TouchstoneLoginButton = () => (
  <a
    className="link-button outlined touchstone-text-logo"
    href={TOUCHSTONE_URL}
  >
    Touchstone
    <span className="ampersand">@</span>
    MIT
  </a>
)

export default TouchstoneLoginButton

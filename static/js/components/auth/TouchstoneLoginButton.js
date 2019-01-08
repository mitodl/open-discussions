// @flow
/* global SETTINGS:false */
import React from "react"

import { TOUCHSTONE_URL } from "../../lib/url"

type Props = {
  next?: string
}

const TouchstoneLoginButton = ({ next }: Props) => (
  <a
    className="link-button outlined touchstone-text-logo"
    href={next ? `${TOUCHSTONE_URL}&next=${next}` : TOUCHSTONE_URL}
  >
    Touchstone
    <span className="ampersand">@</span>
    MIT
  </a>
)

export default TouchstoneLoginButton

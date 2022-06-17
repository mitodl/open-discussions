// @flow
import React from "react"

import { MIT_LOGO_URL } from "../lib/url"

const MITLogoLink = () => (
  <a href="http://www.mit.edu" className="mitlogo">
    <img src={MIT_LOGO_URL} alt="MIT logo" />
  </a>
)

export default MITLogoLink

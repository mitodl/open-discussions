// @flow
import React from "react"
import { Link } from "react-router-dom"
import Tooltip from "rc-tooltip"

import { userIsAnonymous } from "../lib/util"
import { LOGIN_URL, REGISTER_URL } from "../lib/url"

import type { Location } from "react-router-dom"

export const LoginTooltipContent = () => (
  <div className="tooltip login-tooltip">
    <h4>Join MIT Open</h4>
    <div className="tooltip-text">
      As a member, you can share your ideas, subscribe, vote, and comment on
      educational content that matters to you.
    </div>
    <div className="bottom-row">
      <div className="tooltip-buttons">
        <Link
          className="link-button"
          to={(location: Location) =>
            `${LOGIN_URL}?next=${encodeURIComponent(location.pathname)}`
          }
        >
          Log In
        </Link>
      </div>
    </div>
  </div>
)

type Props = {
  children: Array<React$Element<any>> | React$Element<any>
}

const LoginTooltip = ({ children }: Props) =>
  userIsAnonymous() ? (
    <Tooltip placement="top" trigger={["click"]} overlay={LoginTooltipContent}>
      {children}
    </Tooltip>
  ) : (
    children
  )

export default LoginTooltip

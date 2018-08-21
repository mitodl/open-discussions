// @flow
/* global SETTINGS: false */
import React from "react"
import { Link } from "react-router-dom"
import moment from "moment"

const Footer = () => (
  <div className="footer">
    <div className="row">
      <Link to="/content_policy">Community guidelines</Link>
    </div>
    <div className="row">
      <a href={SETTINGS.authenticated_site.tos_url}>Terms & Conditions</a>
    </div>
    <div className="row mit-logo">
      <img
        src="/static/images/mit-logo-darkgrey.svg"
        alt="MIT logo"
        width="36"
        height="16"
      />
    </div>
    <div className="row legal">
      Massachusetts Institute of Technology<br />
      © 2016-{moment().format("Y")} - All rights reserved
    </div>
  </div>
)

export default Footer

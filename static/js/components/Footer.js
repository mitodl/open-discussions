// @flow
/* global SETTINGS: false */
import React from "react"
import { Link } from "react-router-dom"
import moment from "moment"

const Footer = () => (
  <div className="footer">
    <div className="row">
      <a
        href={`mailto:${SETTINGS.support_email}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Contact us
      </a>
    </div>
    <div className="row">
      <Link to="/content_policy">Community Guidelines</Link>
    </div>
    <div className="row">
      <a href={SETTINGS.authenticated_site.tos_url}>Terms & Conditions</a>
    </div>
    <div className="row mit-logo">
      <a href="https://www.mit.edu/" target="_blank" rel="noopener noreferrer">
        <img
          src="/static/images/mit-logo-darkgrey.svg"
          alt="MIT logo"
          width="36"
          height="16"
        />
      </a>
    </div>
    <div className="row legal">
      Massachusetts Institute of Technology<br />
      © 2016-{moment().format("Y")} - All rights reserved
    </div>
  </div>
)

export default Footer

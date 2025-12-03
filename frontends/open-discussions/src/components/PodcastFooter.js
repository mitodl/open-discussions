// @flow
/* global SETTINGS: false */
import React from "react"
import { Link } from "react-router-dom"
import moment from "moment"

import { PODCAST_URL } from "../lib/url"

export default function PodcastFooter() {
  return (
    <div className="podcast-footer">
      <div className="podcast-disclaimer-box">
        <div className="podcast-disclaimer">
          <strong>Disclaimer</strong> - The views, thoughts, and opinions
          expressed in the programs listed above are the speaker’s own and do
          not necessarily represent the views, thoughts, and opinions of the
          Massachusetts Institute of Technology. The material and information
          presented here is for general information purposes only.
        </div>
      </div>
      <div className="cells">
        <div className="cell logo-legal">
          <a
            href="https://www.mit.edu/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/static/images/mit-logo-darkgrey.svg"
              alt="MIT logo"
              width="36"
              height="16"
            />
          </a>
          <div className="legal">
            Massachusetts Institute of Technology
            <br />© 2016-{moment().format("Y")} - All rights reserved
          </div>
        </div>
        <div className="cell links">
          <a
            href={`mailto:${SETTINGS.support_email}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact us
          </a>
          <div className="bar">{" | "}</div>
          <Link to="/content_policy">Community Guidelines</Link>
          <div className="bar">{" | "}</div>
          <a href={SETTINGS.authenticated_site.tos_url}>Terms & Conditions</a>
          <div className="bar">{" | "}</div>
          <a href="https://accessibility.mit.edu/">Accessibility</a>
        </div>
        <div className="cell title">
          <Link className="home-link" to="/">
            MIT Open
          </Link>
          <div className="bar">{" | "}</div>
          <Link className="section-link" to={PODCAST_URL}>
            PODCASTS
          </Link>
        </div>
      </div>
    </div>
  )
}

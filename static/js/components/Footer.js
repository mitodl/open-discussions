// @flow
/* global SETTINGS: false */
import React from "react"
import { Link } from "react-router-dom"

const Footer = () =>
  <div className="footer">
    <div className="row">
      <img src="/static/images/mit-logo-ltgray-white@72x38.svg" />
      <a
        href="https://giving.mit.edu/explore/campus-student-life/digital-learning"
        className="give-link"
      >
        Give to MIT
      </a>
    </div>
    <div className="row links">
      <a href="https://www.edx.org/">edX</a>
      <a href="https://openlearning.mit.edu/">Office of Digital Learning</a>
      <a href={SETTINGS.authenticated_site.tos_url}>
        {SETTINGS.authenticated_site.title} Terms of Service
      </a>
      <Link to="/content_policy">Discussions Community Guidelines</Link>
    </div>
    <div className="row legal">
      <div className="address">
        Massachusetts Institute of Technology<br />Cambridge, MA 02139
      </div>
      <div className="copyright">
        © 2016-2018 Massachusetts Institute of Technology
      </div>
    </div>
  </div>

export default Footer

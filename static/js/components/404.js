// @flow
import React from "react"

import Card from "../components/Card"

const NotFound = () =>
  <div>
    <Card>
      <div className="not-found">
        <div className="header">Page not found.</div>
        <div className="detail">
          This is a 404 error. This is not the page you were looking for.
        </div>
      </div>
    </Card>
  </div>

export default NotFound

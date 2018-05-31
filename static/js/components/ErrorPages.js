// @flow
import React from "react"

import Card from "../components/Card"

const ErrorPage = (header, detail) => () => (
  <div>
    <Card>
      <div className="not-found">
        <div className="header">{header}</div>
        <div className="detail">{detail}</div>
      </div>
    </Card>
  </div>
)

export const NotFound = ErrorPage(
  "Page not found",
  "This is a 404 error. This is not the page you were looking for."
)

export const NotAuthorized = ErrorPage(
  "Stop! Who goes there?",
  "You do not have permission to view this page."
)

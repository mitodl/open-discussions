import React from "react"

import Card from "./Card"
import MetaTags from "./MetaTags"
import ShutdownNotice from "./ShutdownNotice"

const ErrorPage = (header: string, detail: string, noIndex: boolean) => () =>
  (
    <div>
      {noIndex ? (
        <MetaTags>
          <meta name="robots" content="noindex,noarchive" />
        </MetaTags>
      ) : null}
      <Card>
        <div className="not-found">
          <div className="header">{header}</div>
          <div className="detail">{detail}</div>
        </div>
      </Card>
    </div>
  )

const NotFoundWithShutdown = () => (
  <div>
    <MetaTags>
      <meta name="robots" content="noindex,noarchive" />
    </MetaTags>
    <Card>
      <div className="not-found">
        <div className="header">Page not found</div>
        <div className="detail">
          This is a 404 error. This is not the page you were looking for.
        </div>
      </div>
    </Card>
    <ShutdownNotice />
  </div>
)

export const NotFound = NotFoundWithShutdown

export const NotAuthorized = ErrorPage(
  "Stop! Who goes there?",
  "You do not have permission to view this page.",
  true
)

import React from "react"

import Card from "./Card"
import MetaTags from "./MetaTags"

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
    <Card className="shutdown-notice">
      <div className="shutdown-message">
        <h2>Service Shutdown Notice</h2>
        <p>
          This site is being shut down. The discussion channels that were
          previously available on open.mit.edu are no longer in service.
        </p>
        <p>
          We encourage you to explore our new learning platform at{" "}
          <a
            href="https://learn.mit.edu"
            target="_blank"
            rel="noopener noreferrer"
          >
            learn.mit.edu
          </a>
          .
        </p>
        <p>
          If you have any questions, please{" "}
          <a
            href="https://mitlearn.zendesk.com/hc/en-us/requests/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            contact us
          </a>
          .
        </p>
      </div>
    </Card>
    <Card>
      <div className="not-found">
        <div className="header">Page not found</div>
        <div className="detail">
          This is a 404 error. This is not the page you were looking for.
        </div>
      </div>
    </Card>
  </div>
)

export const NotFound = NotFoundWithShutdown

export const NotAuthorized = ErrorPage(
  "Stop! Who goes there?",
  "You do not have permission to view this page.",
  true
)

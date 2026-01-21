// @flow
import React from "react"

import Card from "./Card"

/**
 * Display a prominent shutdown notice informing users that the site is being shut down
 * and discussion channels are no longer in service.
 */
export default function ShutdownNotice() {
  return (
    <Card className="shutdown-notice">
      <div className="shutdown-message">
        <h2>This Site Is Closing</h2>
        <p>
          MIT Open is shutting down. The discussion channels that were
          previously available on open.mit.edu are no longer in service.
        </p>
        <p>
          We encourage you to explore our new learning platform, MIT Learn, at{" "}
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
  )
}

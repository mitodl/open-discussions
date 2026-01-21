// @flow
import React from "react"

import type { Match } from "react-router"

type Props = {
  match: Match
}

export default class AdminPage extends React.Component<Props> {
  render() {
    return (
      <div className="admin-page">
        <h1>Admin</h1>
        <p>Admin functionality has been removed.</p>
      </div>
    )
  }
}

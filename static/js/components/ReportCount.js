// @flow
import React from "react"

type Props = {
  count: ?number
}

export default class ReportCount extends React.Component<Props> {
  render() {
    const { count } = this.props
    if (!count) {
      return null
    }

    return (
      <div className="report-count">
        {count} {count === 1 ? "Report" : "Reports"}
      </div>
    )
  }
}

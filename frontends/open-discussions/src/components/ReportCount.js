// @flow
import React from "react"

type Props = {
  count: ?number
}

const ReportCount = ({ count }: Props) =>
  count ? (
    <div className="report-count">
      {count} {count === 1 ? "Report" : "Reports"}
    </div>
  ) : null

export default ReportCount

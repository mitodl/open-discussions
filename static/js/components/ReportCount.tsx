
import React from "react";

type Props = {
  count: number | null | undefined;
};

const ReportCount = ({
  count
}: Props) => count ? <div className="report-count">
      {count} {count === 1 ? "Report" : "Reports"}
    </div> : null;

export default ReportCount;
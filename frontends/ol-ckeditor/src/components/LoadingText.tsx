import React from "react"
import Skeleton from "@mui/material/Skeleton"

const LoadingText: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div aria-label="Loading">
    {Array(lines - 1)
      .fill(0)
      .map((__, i) => (
        <Skeleton key={i} variant="text" width="100%" />
      ))}
    <Skeleton variant="text" width="60%" />
  </div>
)

export default LoadingText

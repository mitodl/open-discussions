import React from "react"
import Skeleton from "@mui/material/Skeleton"

const LoadingText = () => (
  <div aria-label="Loading">
    <Skeleton variant="text" />
    <Skeleton variant="text" />
    <Skeleton variant="text" width="60%" />
  </div>
)

export default LoadingText

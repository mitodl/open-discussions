import React from "react"
import CircularProgress from "@mui/material/CircularProgress"
import Fade from "@mui/material/Fade"

type LoadingSpinnerProps = {
  loading: boolean
  "aria-label"?: string
}

const noDelay = { transitionDelay: "0ms" }
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  loading,
  "aria-label": label = "Loading"
}) => {
  return (
    <div className="ol-loading-spinner">
      <Fade in={loading} style={!loading ? noDelay : undefined} unmountOnExit>
        <CircularProgress aria-label={label} />
      </Fade>
    </div>
  )
}

export default LoadingSpinner

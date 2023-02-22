import React from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import Fade from '@mui/material/Fade'

type LoadingSpinnerProps = {
  loading: boolean
}

const noDelay = { transitionDelay: "0ms" }
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  loading
}) => {
  return (
    <div className="ol-loading-spinner">
      <Fade
        in={loading}
        style={!loading ? noDelay : undefined }
        unmountOnExit
      >
        <CircularProgress />
      </Fade>
    </div>
  )
}

export default LoadingSpinner

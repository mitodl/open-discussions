import React from "react"
import Container from "@mui/material/Container"
import { BannerPage } from "ol-util"
import { Link } from "react-router-dom"

const ForbiddenPage: React.FC = () => {
  return (
    <BannerPage>
      <Container>
        <span>403 forbidden error: you don't have permission to access this resource</span>
        <Link to="/infinite">
          <button>Take me to safety</button>
        </Link>
      </Container>
    </BannerPage>
  )
}

export default ForbiddenPage

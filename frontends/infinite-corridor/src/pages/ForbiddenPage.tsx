import React from "react"
import Container from "@mui/material/Container"
import { BannerPage } from "ol-util"
import { Link } from "react-router-dom"

const ForbiddenPage: React.FC = () => {
  return (
    <BannerPage>
      <Container>
        <span>Uh oh.</span>
        <Link to="/infinite">
          <button>Take me to safety</button>
        </Link>
      </Container>
    </BannerPage>
  )
}

export default ForbiddenPage

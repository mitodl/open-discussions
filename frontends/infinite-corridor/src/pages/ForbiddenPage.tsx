import React from "react"
import Container from "@mui/material/Container"
import { Link } from "react-router-dom"
import Button from "@mui/material/Button"

const ForbiddenPage: React.FC = () => {
  return (
    <Container className="error-page">
      <Container className="error-container">
        <div className="page-title">
          403 Forbidden Error: You do not have permission to access this resource
        </div>
        <div className="button-container">
          <Button className="return-button" variant="outlined" href="/infinite">
            Home</Button>
        </div>
      </Container>
    </Container>
  )
}

export default ForbiddenPage

import React from "react"
import Container from "@mui/material/Container"
import Button from "@mui/material/Button"

const NotFoundPage: React.FC = () => {
  return (
    <Container className="error-page">
      <Container className="error-container">
        <div className="page-title">
          404 Not Found Error: Resource not found
        </div>
        <div className="button-container">
          <Button className="return-button" variant="outlined" href="/infinite">
            Home</Button>
        </div>
      </Container>
    </Container>
  )
}

export default NotFoundPage

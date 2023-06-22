import React from "react"
import Container from "@mui/material/Container"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import CardActions from "@mui/material/CardActions"
import Button from "@mui/material/Button"

const ForbiddenPage: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Card style={{ marginTop: "1em" }}>
        <CardContent>
          <h1>403 Forbidden Error</h1>
          You do not have permission to access this resource.
        </CardContent>
        <CardActions>
          <Button variant="outlined" href="/infinite">
            Home
          </Button>
        </CardActions>
      </Card>
    </Container>
  )
}

export default ForbiddenPage

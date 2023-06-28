import React from "react"
import Container from "@mui/material/Container"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import CardActions from "@mui/material/CardActions"
import Button from "@mui/material/Button"

import { HOME } from "./urls"
import { MetaTags } from "ol-util"

const NotFoundPage: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Card sx={{ marginTop: "1rem" }}>
        <MetaTags>
          <meta name="robots" content="noindex,noarchive" />
        </MetaTags>
        <CardContent>
          <h1>404 Not Found Error</h1>
          Resource Not Found
        </CardContent>
        <CardActions>
          <Button aria-label="Return Home" variant="outlined" href={HOME}>
            Home
          </Button>
        </CardActions>
      </Card>
    </Container>
  )
}

export default NotFoundPage

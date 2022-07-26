import React, { useCallback } from "react"
import { useParams, useLocation } from "react-router"
import Tab from "@mui/material/Tab"
import TabContext from "@mui/lab/TabContext"
import TabList from "@mui/lab/TabList"
import TabPanel from "@mui/lab/TabPanel"
import Container from "@mui/material/Container"
import Divider from "@mui/material/Divider"
import Grid from "@mui/material/Grid"
import { useFieldDetails } from "../api/fields"
import { Link } from "react-router-dom"
import FieldPageSkeleton from "./FieldPageSkeleton"

type RouteParams = {
  name: string
}

const keyFromHash = (hash: string) => {
  const keys = ["home", "about"]
  const match = keys.find(key => `#${key}` === hash)
  return match ?? "home"
}

const FieldPage: React.FC = () => {
  const { name } = useParams<RouteParams>()
  const { hash } = useLocation()

  const [value, setValue] = React.useState(keyFromHash(hash))
  const field = useFieldDetails(name)
  const handleChange = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      setValue(newValue)
    },
    []
  )

  return (
    <FieldPageSkeleton name={name}>
      <TabContext value={value}>
        <Container>
          <Grid container spacing={1}>
            <Grid item xs={8}>
              <TabList
                className="page-nav"
                onChange={handleChange}
                aria-label="lab API tabs example"
              >
                <Tab component={Link} to="#" label="Home" value="home" />
                <Tab component={Link} to="#about" label="About" value="about" />
              </TabList>
            </Grid>
          </Grid>
        </Container>
        <Divider />
        <Container>
          <Grid container spacing={1}>
            <Grid item xs={8}>
              <TabPanel value="home">
                <p>{field.data?.public_description}</p>
                <section>Featured Courses</section>
              </TabPanel>
              <TabPanel value="about">BBBBBB</TabPanel>
            </Grid>
            <Grid item xs={4}>
              Featured Video
            </Grid>
          </Grid>
        </Container>
      </TabContext>
    </FieldPageSkeleton>
  )
}

export default FieldPage

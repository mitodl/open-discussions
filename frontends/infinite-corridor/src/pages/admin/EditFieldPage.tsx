import React, { useCallback } from "react"
import { useLocation, useParams } from "react-router"
import { Link } from "react-router-dom"
import { Helmet, HelmetProvider } from "react-helmet-async"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import TabList from "@mui/lab/TabList"
import Tab from "@mui/material/Tab"
import { TabContext } from "@mui/lab"
import TabPanel from "@mui/lab/TabPanel"

import { useFieldDetails } from "../../api/fields"
import EditFieldAppearanceForm from "./EditFieldAppearanceForm"
import FieldPageSkeleton from "../FieldPageSkeleton"

type RouteParams = {
  name: string
}

const keyFromHash = (hash: string) => {
  const keys = ["appearance", "basic", "moderators"]
  const match = keys.find(key => `#${key}` === hash)
  return match ?? "basic"
}

const EditFieldPage: React.FC = () => {
  const { name } = useParams<RouteParams>()
  const { hash } = useLocation()
  const field = useFieldDetails(name)
  const [value, setValue] = React.useState(keyFromHash(hash))
  const handleChange = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      setValue(newValue)
    },
    []
  )

  return field.data ? (
    <FieldPageSkeleton name={name || ""}>
      <HelmetProvider>
        <Helmet>
          <title>Edit {field.data.title} Channel</title>
        </Helmet>
      </HelmetProvider>
      {field.data.is_moderator ? (
        <TabContext value={value}>
          <div className="page-subbanner">
            <Container className="page-nav-container">
              <Grid container spacing={1}>
                <Grid item xs={9}>
                  <TabList className="page-nav" onChange={handleChange}>
                    <Tab component={Link} to="#" label="Basic" value="basic" />
                    <Tab
                      component={Link}
                      to="#appearance"
                      label="Appearance"
                      value="appearance"
                    />
                    <Tab
                      component={Link}
                      to="#moderators"
                      label="Moderators"
                      value="moderators"
                    />
                  </TabList>
                </Grid>
              </Grid>
            </Container>
          </div>
          <Container>
            <Grid container spacing={1} className="edit-channel">
              <Grid item xs={9}>
                <TabPanel value="basic">Basic placeholder</TabPanel>
                <TabPanel value="appearance">
                  <EditFieldAppearanceForm field={field.data} />
                </TabPanel>
                <TabPanel value="moderators">Moderators placeholder</TabPanel>
              </Grid>
            </Grid>
          </Container>
        </TabContext>
      ) : (
        <Container>
          <Grid item xs={8}>
            <div className="row">
              You do not have permission to access this page.
            </div>
          </Grid>
        </Container>
      )}
    </FieldPageSkeleton>
  ) : null
}

export default EditFieldPage

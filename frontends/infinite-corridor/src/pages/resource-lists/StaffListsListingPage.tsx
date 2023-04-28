import React, { useCallback } from "react"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid"

import { BannerPage } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import { useStaffListsListing } from "../../api/learning-resources"
import Container from "@mui/material/Container"
import { LearningResourceCardTemplate } from "ol-search-ui"
import type { StaffList } from "ol-search-ui"
import { imgConfigs } from "../../util/constants"
import { useHistory } from "react-router"
import { makeUserListViewPath } from "../urls"
import EditListMenu from "./EditListMenu"
import { manageListDialogs } from "./ManageListDialogs"

const StaffListsListingPage: React.FC = () => {
  const staffListsQuery = useStaffListsListing()

  const history = useHistory()
  const handleActivate = useCallback(
    (resource: StaffList) => {
      const path = makeUserListViewPath(resource.id)
      history.push(path)
    },
    [history]
  )

  return (
    <BannerPage
      src="/static/images/course_search_banner.png"
      alt=""
      compactOnMobile
    >
      <Container maxWidth="sm">
        <GridContainer>
          <GridColumn variant="single-full">
            <Grid container className="ic-list-header">
              <Grid item xs={6}>
                <h1>Staff Lists</h1>
              </Grid>
              <Grid item xs={6} className="ic-centered-right">
                <Button
                  variant="contained"
                  onClick={manageListDialogs.createStaffList}
                >
                  Create new list
                </Button>
              </Grid>
            </Grid>
            <section>
              {staffListsQuery.isLoading && <p>Loading...</p>}
              {staffListsQuery.data && (
                <ul className="ic-card-row-list">
                  {staffListsQuery.data.results.map(list => {
                    return (
                      <li key={list.id}>
                        <LearningResourceCardTemplate
                          variant="row-reverse"
                          className="ic-resource-card"
                          resource={list}
                          imgConfig={imgConfigs["row-reverse-small"]}
                          footerActionSlot={
                            <EditListMenu
                              resource={list}
                              onEdit={manageListDialogs.editStaffList}
                              onDelete={manageListDialogs.deleteList}
                            />
                          }
                          onActivate={handleActivate}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </GridColumn>
        </GridContainer>
      </Container>
    </BannerPage>
  )
}

export default StaffListsListingPage

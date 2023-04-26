import React, { useCallback } from "react"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid"

import { BannerPage } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import {
  useStaffListsListing,
} from "../../api/learning-resources"
import Container from "@mui/material/Container"
import { LearningResourceCardTemplate } from "ol-search-ui"
import type { StaffList } from "ol-search-ui"
import { imgConfigs } from "../../util/constants"
import { useHistory } from "react-router"
import { makeUserListViewPath } from "../urls"
import EditListMenu from "./EditListMenu"
import { CreateListDialog, EditListDialog, useCreationDialog, useDeleteListDialog, useEditingDialog } from "./ManageListDialogs"

const placeholderHandler = () => console.log('TODO')

const StaffListsListingPage: React.FC = () => {
  const creation = useCreationDialog()
  const editing = useEditingDialog()
  const deletion = useDeleteListDialog()
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
                <Button variant="contained" onClick={placeholderHandler}>
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
                              onEdit={editing.handleStart}
                              onDelete={deletion.handleStart}
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
      <CreateListDialog
        mode="stafflist"
        open={creation.isOpen}
        onClose={creation.handleFinish}
      />
      <EditListDialog
        mode="stafflist"
        resource={editing.resource}
        onClose={editing.handleFinish}
      />
    </BannerPage>
  )
}

export default StaffListsListingPage

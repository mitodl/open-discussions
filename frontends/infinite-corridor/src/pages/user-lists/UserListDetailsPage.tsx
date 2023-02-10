import React from "react"
import { BannerPage } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import { useUserListItems, useUserList } from "../../api/learning-resources"
import Container from "@mui/material/Container"
import EditIcon from "@mui/icons-material/Edit"
import Grid from "@mui/material/Grid"
import Button from "@mui/material/Button"
import { LearningResourceCard } from "ol-search-ui"
import { EditListDialog, useEditingDialog } from "./ManageListDialogs"
import { imgConfigs } from "../../util/constants"
import { useParams } from "react-router"
import { useActivateResourceDrawer } from "../LearningResourceDrawer"

type RouteParams = {
  id: string
}

const UserListsDetailsPage: React.FC = () => {
  const id = Number(useParams<RouteParams>().id)
  const userListQuery = useUserList(id)
  const itemsDataQuery = useUserListItems(id)
  const activateResource = useActivateResourceDrawer()
  const editing = useEditingDialog()

  return (
    <BannerPage
      src="/static/images/course_search_banner.png"
      alt=""
      compactOnMobile
    >
      <Container className="userlist-page">
        <GridContainer>
          <GridColumn variant="main-2-wide-main">
            {userListQuery.data && (
              <Grid container className="ic-list-header">
                <Grid item xs={6}>
                  <h1>{userListQuery.data.title}</h1>
                </Grid>
                <Grid item xs={6} className="ic-centered-right">
                  <Button
                    color="secondary"
                    startIcon={<EditIcon />}
                    onClick={() => editing.handleStart(userListQuery.data)}
                  >
                    Edit
                  </Button>
                </Grid>
              </Grid>
            )}
            {itemsDataQuery.isLoading && <p>Loading...</p>}
            {itemsDataQuery.data &&
              (itemsDataQuery.data.results.length === 0 ? (
                <p className="empty-message">
                  There are no items in this list yet.
                </p>
              ) : (
                <ul className="ic-card-row-list">
                  {itemsDataQuery.data.results.map(list => {
                    return (
                      <li key={list.id}>
                        <LearningResourceCard
                          variant="row-reverse"
                          className="ic-resource-card"
                          resource={list.content_data}
                          imgConfig={imgConfigs["row-reverse"]}
                          onActivate={activateResource}
                        />
                      </li>
                    )
                  })}
                </ul>
              ))}
          </GridColumn>
        </GridContainer>
      </Container>
      <EditListDialog
        resource={editing.resource}
        onClose={editing.handleFinish}
      />
    </BannerPage>
  )
}

export default UserListsDetailsPage

import React from "react"
import { BannerPage } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import { useUserListItems, useUserList } from "../../api/learning-resources"
import Container from "@mui/material/Container"
import EditIcon from "@mui/icons-material/Edit"
import Grid from "@mui/material/Grid"
import Button from "@mui/material/Button"
import { EditListDialog, useEditingDialog } from "./ManageListDialogs"
import { useParams } from "react-router"
import UserListItems from "./ItemsListing"

type RouteParams = {
  id: string
}

const UserListsDetailsPage: React.FC = () => {
  const id = Number(useParams<RouteParams>().id)
  const userListQuery = useUserList(id)
  const itemsDataQuery = useUserListItems(id)
  const editing = useEditingDialog()

  const canEdit = userListQuery.data?.author === SETTINGS.user.id

  return (
    <BannerPage
      src="/static/images/course_search_banner.png"
      alt=""
      compactOnMobile
    >
      <Container maxWidth="sm" className="userlist-page">
        <GridContainer>
          <GridColumn variant="single-full">
            {userListQuery.data && (
              <Grid container className="ic-list-header">
                <Grid item xs={9}>
                  <h1>{userListQuery.data.title}</h1>
                </Grid>
                <Grid item xs={3} className="ic-centered-right">
                  {canEdit && (
                    <Button
                      color="secondary"
                      startIcon={<EditIcon />}
                      onClick={() => editing.handleStart(userListQuery.data)}
                    >
                      Edit
                    </Button>
                  )}
                </Grid>
              </Grid>
            )}
            <UserListItems
              isLoading={itemsDataQuery.isLoading}
              data={itemsDataQuery.data}
              emptyMessage="There are no items in this list yet."
            />
          </GridColumn>
        </GridContainer>
      </Container>
      {canEdit && (
        <EditListDialog
          resource={editing.resource}
          onClose={editing.handleFinish}
        />
      )}
    </BannerPage>
  )
}

export default UserListsDetailsPage

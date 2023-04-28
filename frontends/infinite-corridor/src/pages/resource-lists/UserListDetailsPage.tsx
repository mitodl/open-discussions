import React, { useMemo } from "react"
import { BannerPage, useToggle, pluralize } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import { useUserList, useUserListItems } from "../../api/learning-resources"
import Container from "@mui/material/Container"
import EditIcon from "@mui/icons-material/Edit"
import Grid from "@mui/material/Grid"
import Button from "@mui/material/Button"

import { useParams } from "react-router"
import UserListItems from "./ItemsListing"
import { LearningResourceType as LRT } from "ol-search-ui"
import SwapVertIcon from "@mui/icons-material/SwapVert"
import { manageListDialogs } from "./ManageListDialogs"

type RouteParams = {
  id: string
}

const UserListsDetailsPage: React.FC = () => {
  const id = Number(useParams<RouteParams>().id)
  const userListQuery = useUserList(id)
  const itemsQuery = useUserListItems(id)
  const [isSorting, toggleIsSorting] = useToggle(false)

  const itemCount = userListQuery.data?.item_count
  const canEdit = userListQuery.data?.author === SETTINGS.user.id
  const canSort =
    canEdit && itemCount && userListQuery.data?.object_type === LRT.LearningPath
  const description = userListQuery.data?.short_description
  const count = userListQuery.data?.item_count

  const items = useMemo(() => {
    const pages = itemsQuery.data?.pages
    return pages?.flatMap(p => p.results.map(r => r))
  }, [itemsQuery.data])

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
                <Grid item xs={12}>
                  <h1>{userListQuery.data.title}</h1>
                  {description && <p>{description}</p>}
                </Grid>
                <Grid
                  item
                  xs={6}
                  container
                  alignItems="center"
                  justifyContent="space-between"
                >
                  {canSort && (
                    <Button
                      color="secondary"
                      disabled={count === 0}
                      startIcon={isSorting ? undefined : <SwapVertIcon />}
                      onClick={toggleIsSorting.toggle}
                    >
                      {isSorting ? "Done ordering" : "Reorder"}
                    </Button>
                  )}
                  {count !== undefined && count > 0 ?
                    `${count} ${pluralize("item", count)}` :
                    null}
                </Grid>
                <Grid
                  item
                  xs={6}
                  container
                  alignItems="center"
                  className="ic-centered-right"
                >
                  {canEdit ? (
                    <Button
                      color="secondary"
                      startIcon={<EditIcon />}
                      onClick={() =>
                        manageListDialogs.editUserList(userListQuery.data)
                      }
                    >
                      Edit
                    </Button>
                  ) : null}
                </Grid>
              </Grid>
            )}
            <UserListItems
              id={id}
              items={items}
              isLoading={itemsQuery.isLoading}
              isRefetching={itemsQuery.isFetching}
              sortable={isSorting}
              emptyMessage="There are no items in this list yet."
            />
          </GridColumn>
        </GridContainer>
      </Container>
    </BannerPage>
  )
}

export default UserListsDetailsPage

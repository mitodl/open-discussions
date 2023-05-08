import React, { useMemo } from "react"
import { BannerPage, useToggle, pluralize } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import {
  useStaffList,
  useStaffListItems,
  useUserList,
  useUserListItems
} from "../../api/learning-resources"
import Container from "@mui/material/Container"
import EditIcon from "@mui/icons-material/Edit"
import Grid from "@mui/material/Grid"
import Button from "@mui/material/Button"

import { useParams } from "react-router"
import ResourceListItems from "./ItemsListing"
import {
  LearningResourceType as LRT,
  PaginatedListItems,
  StaffList,
  UserList
} from "ol-search-ui"
import SwapVertIcon from "@mui/icons-material/SwapVert"
import { manageListDialogs } from "./ManageListDialogs"
import { UseInfiniteQueryResult, UseQueryResult } from "react-query"

type RouteParams = {
  id: string
}

const ResourceListDetailsPage: React.FC<{
  mode: "userlist" | "stafflist"
  listQuery: UseQueryResult<StaffList | UserList>
  itemsQuery: UseInfiniteQueryResult<PaginatedListItems>
  canEdit: boolean
  canSort: boolean
}> = ({ mode, listQuery, itemsQuery, canEdit, canSort }) => {
  const id = Number(useParams<RouteParams>().id)
  const [isSorting, toggleIsSorting] = useToggle(false)

  const items = useMemo(() => {
    const pages = itemsQuery.data?.pages
    return pages?.flatMap(p => p.results.map(r => r))
  }, [itemsQuery.data])

  const showSort = !!items?.length && canSort
  const description = listQuery.data?.short_description
  const count = listQuery.data?.item_count

  return (
    <BannerPage
      src="/static/images/course_search_banner.png"
      alt=""
      compactOnMobile
    >
      <Container maxWidth="sm" className="userlist-page">
        <GridContainer>
          <GridColumn variant="single-full">
            {listQuery.data && (
              <Grid container className="ic-list-header">
                <Grid item xs={12}>
                  <h1>{listQuery.data.title}</h1>
                  {description && <p>{description}</p>}
                </Grid>
                <Grid
                  item
                  xs={6}
                  container
                  alignItems="center"
                  justifyContent="space-between"
                >
                  {showSort && (
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
                      onClick={() => manageListDialogs.editList(listQuery.data)}
                    >
                      Edit
                    </Button>
                  ) : null}
                </Grid>
              </Grid>
            )}
            <ResourceListItems
              id={id}
              mode={mode}
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

const UserListDetailsPage: React.FC = () => {
  const id = Number(useParams<RouteParams>().id)
  const listQuery = useUserList(id)
  const itemsQuery = useUserListItems(id)
  const canEdit = SETTINGS.user.id === listQuery.data?.author
  const canSort = canEdit && listQuery.data?.object_type === LRT.LearningPath
  return (
    <ResourceListDetailsPage
      mode="userlist"
      listQuery={listQuery}
      itemsQuery={itemsQuery}
      canEdit={canEdit}
      canSort={canSort}
    />
  )
}

const StaffListDetailsPage: React.FC = () => {
  const id = Number(useParams<RouteParams>().id)
  const listQuery = useStaffList(id)
  const itemsQuery = useStaffListItems(id)

  const canEdit = SETTINGS.user.is_staff_list_editor
  const canSort = canEdit && listQuery.data?.object_type === LRT.StaffPath
  return (
    <ResourceListDetailsPage
      mode="stafflist"
      listQuery={listQuery}
      itemsQuery={itemsQuery}
      canEdit={canEdit}
      canSort={canSort}
    />
  )
}

export { UserListDetailsPage, StaffListDetailsPage }

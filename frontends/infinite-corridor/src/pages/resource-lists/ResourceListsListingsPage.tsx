import React, { useCallback } from "react"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import ListItemIcon from "@mui/material/ListItemIcon"
import IconButton from "@mui/material/IconButton"

import { BannerPage, useToggle } from "ol-util"
import { manageListDialogs } from "./ManageListDialogs"
import { GridColumn, GridContainer } from "../../components/layout"
import {
  useFavoritesListing,
  useStaffListsListing,
  useUserListsListing
} from "../../api/learning-resources"
import Container from "@mui/material/Container"
import { LearningResourceCardTemplate, TYPE_FAVORITES } from "ol-search-ui"
import type { UserList, StaffList, Favorites } from "ol-search-ui"
import { imgConfigs } from "../../util/constants"
import { useHistory } from "react-router"
import {
  FAVORITES_VIEW,
  makeStaffListsViewPath,
  makeUserListViewPath
} from "../urls"

type EditListMenuProps<L extends UserList | StaffList> = {
  resource: L
}
const EditListMenu = <L extends UserList | StaffList>({
  resource
}: EditListMenuProps<L>) => {
  const [open, toggleOpen] = useToggle(false)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const handleEdit = useCallback(() => {
    manageListDialogs.editList(resource)
    toggleOpen.off()
  }, [resource, toggleOpen])
  const handleDelete = useCallback(() => {
    manageListDialogs.deleteList(resource)
    toggleOpen.off()
  }, [resource, toggleOpen])
  return (
    <>
      <IconButton
        aria-label={`Edit list ${resource.title}`}
        onClick={toggleOpen.on}
        ref={setAnchorEl}
        size="small"
      >
        <MoreVertIcon fontSize="inherit" />
      </IconButton>
      <Menu open={open} onClose={toggleOpen.off} anchorEl={anchorEl}>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </>
  )
}

/**
 * Makes a fake userlist object for the favorites list.
 *
 * "Favorites" is a special case because it's not a real userlist (with title,
 * topics, etc). It's just a list of favorited items that we present similarly
 * to other lists.
 */
const makeFavorites = (count: number): Favorites => {
  return {
    title:         "My Favorites",
    object_type:   TYPE_FAVORITES,
    list_type:     "favorites",
    item_count:    count,
    topics:        [],
    lists:         [],
    image_src:     null,
    certification: []
  }
}

type ListCardProps<L extends UserList | StaffList | Favorites> = {
  list: L
  onActivate: (resource: L) => void
}
const ListCard = <L extends UserList | StaffList | Favorites>({
  list,
  onActivate
}: ListCardProps<L>) => {
  return (
    <LearningResourceCardTemplate
      variant="row-reverse"
      className="ic-resource-card"
      resource={list}
      imgConfig={imgConfigs["row-reverse-small"]}
      footerActionSlot={
        list.object_type === TYPE_FAVORITES ? undefined : (
          <EditListMenu resource={list} />
        )
      }
      onActivate={onActivate}
    />
  )
}

const UserListsListingPage: React.FC = () => {
  const userListsQuery = useUserListsListing()
  const favoritesQuery = useFavoritesListing()
  const favorites = favoritesQuery.data ?
    makeFavorites(favoritesQuery.data.count) :
    null

  const history = useHistory()
  const handleActivate = useCallback(
    (resource: UserList | Favorites) => {
      const path =
        resource.object_type === TYPE_FAVORITES ?
          FAVORITES_VIEW :
          makeUserListViewPath(resource.id)
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
                <h1>My Lists</h1>
              </Grid>
              <Grid item xs={6} className="ic-centered-right">
                <Button
                  variant="contained"
                  onClick={manageListDialogs.createUserList}
                >
                  Create new list
                </Button>
              </Grid>
            </Grid>
            <section>
              {userListsQuery.isLoading && <p>Loading...</p>}
              {userListsQuery.data && (
                <ul className="ic-card-row-list">
                  {favorites && (
                    <li>
                      <ListCard list={favorites} onActivate={handleActivate} />
                    </li>
                  )}
                  {userListsQuery.data.results.map(list => {
                    return (
                      <li key={list.id}>
                        <ListCard list={list} onActivate={handleActivate} />
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

const StaffListsListingPage: React.FC = () => {
  const staffListsQuery = useStaffListsListing()

  const history = useHistory()
  const handleActivate = useCallback(
    (resource: StaffList) => {
      const path = makeStaffListsViewPath(resource.id)
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
                        <ListCard list={list} onActivate={handleActivate} />
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

export { StaffListsListingPage, UserListsListingPage }

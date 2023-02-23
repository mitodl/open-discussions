import React, { useCallback } from "react"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import EditIcon from "@mui/icons-material/Edit"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid"
import DeleteIcon from "@mui/icons-material/Delete"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import ListItemIcon from "@mui/material/ListItemIcon"
import IconButton from "@mui/material/IconButton"

import { BannerPage, useToggle } from "ol-util"
import {
  CreateListDialog,
  EditListDialog,
  DeletionDialog,
  useDeletionDialog,
  useEditingDialog,
  useCreationDialog
} from "./ManageListDialogs"
import { GridColumn, GridContainer } from "../../components/layout"
import {
  useFavoritesListing,
  useUserListsListing
} from "../../api/learning-resources"
import Container from "@mui/material/Container"
import { LearningResourceCard, TYPE_FAVORITES } from "ol-search-ui"
import type { UserList, Favorites } from "ol-search-ui"
import { imgConfigs } from "../../util/constants"
import { useHistory } from "react-router"
import { FAVORITES_VIEW, makeUserListViewPath } from "../urls"

type EditListMenuProps = {
  resource: UserList
  onEdit: (resource: UserList) => void
  onDelete: (resource: UserList) => void
}
const EditListMenu: React.FC<EditListMenuProps> = ({
  resource,
  onEdit,
  onDelete
}) => {
  const [open, toggleOpen] = useToggle(false)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const handleEdit = useCallback(() => {
    onEdit(resource)
    toggleOpen.off()
  }, [resource, onEdit, toggleOpen])
  const handleDelete = useCallback(() => {
    onDelete(resource)
    toggleOpen.off()
  }, [resource, onDelete, toggleOpen])
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

const UserListsListingPage: React.FC = () => {
  const creation = useCreationDialog()
  const editing = useEditingDialog()
  const deletion = useDeletionDialog()

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
                <Button variant="contained" onClick={creation.handleStart}>
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
                      <LearningResourceCard
                        suppressImage
                        variant="row-reverse"
                        className="ic-resource-card"
                        resource={favorites}
                        imgConfig={imgConfigs["row-reverse-small"]}
                        onActivate={handleActivate}
                      />
                    </li>
                  )}
                  {userListsQuery.data.results.map(list => {
                    return (
                      <li key={list.id}>
                        <LearningResourceCard
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
        open={creation.isOpen}
        onClose={creation.handleFinish}
      />
      <EditListDialog
        resource={editing.resource}
        onClose={editing.handleFinish}
      />
      <DeletionDialog
        resource={deletion.resource}
        onClose={deletion.handleFinish}
      />
    </BannerPage>
  )
}

export default UserListsListingPage

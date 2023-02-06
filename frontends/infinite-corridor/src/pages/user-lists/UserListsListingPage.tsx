import React, { useCallback } from "react"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import EditIcon from '@mui/icons-material/Edit'
import Button from '@mui/material/Button'
import Grid from "@mui/material/Grid"
import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ListItemIcon from '@mui/material/ListItemIcon'
import IconButton from "@mui/material/IconButton"

import { BannerPage, useToggle } from "ol-util"
import { CreateListDialog, EditListDialog, DeletionDialog, useDeletionDialog, useEditingDialog, useCreationDialog } from "./ManageListDialog"
import { GridColumn, GridContainer } from "../../components/layout"
import {
  useFavoritesData,
  useUserListsListing
} from "../../api/learning-resources"
import Container from "@mui/material/Container"
import {
  LearningResourceCard,
  LearningResourceType,
} from "ol-search-ui"
import type { UserList } from "ol-search-ui"
import { imgConfigs } from "../../util/constants"

type EditListMenuProps = {
  resource: UserList
  onEdit:   (resource: UserList) => void
  onDelete: (resource: UserList) => void
}
const EditListMenu: React.FC<EditListMenuProps> = ({ resource, onEdit, onDelete }) => {
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
    (
      <>
        <IconButton onClick={toggleOpen.on} ref={setAnchorEl} size="small">
          <MoreVertIcon fontSize="inherit" />
        </IconButton><Menu open={open} onClose={toggleOpen.off} anchorEl={anchorEl}>
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
  )
}

const makeFavorites = (
  count: number
): Omit<UserList, "id" | "author" | "author_name"> => {
  return {
    title:         "My Favorites",
    object_type:   LearningResourceType.Userlist,
    list_type:     "favorites",
    privacy_level: "public",
    item_count:    count,
    topics:        [],
    lists:         [],
    image_src:     null,
    certification: []
  }
}

const UserListsPage: React.FC = () => {
  const creation = useCreationDialog()
  const editing = useEditingDialog()
  const deletion = useDeletionDialog()

  const userListsQuery = useUserListsListing()
  const favoritesQuery = useFavoritesData()
  const favorites = favoritesQuery.data ?
    makeFavorites(favoritesQuery.data.count) :
    null

  const handleDelete = useCallback((id: number) => {
    console.log(`Deleting list ${id}`)
  }, [])


  return (
    <BannerPage
      src="/static/images/course_search_banner.png"
      alt=""
      compactOnMobile
    >
      <Container>
        <GridContainer>
          <GridColumn variant="main-2-wide-main">
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
                            <EditListMenu resource={list} onEdit={editing.handleStart} onDelete={deletion.handleStart} />
                          }
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

export default UserListsPage

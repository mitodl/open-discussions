import React, { useCallback } from "react"
import { Menu } from "@mui/material"
import MenuItem from "@mui/material/MenuItem"
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ListItemIcon from '@mui/material/ListItemIcon'
import IconButton from "@mui/material/IconButton"

import { BannerPage, useToggle } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import {
  useFavoritesData,
  useUserListsListing
} from "../../api/learning-resources"
import Container from "@mui/material/Container"
import {
  LearningResourceCard,
  UserList,
  LearningResourceType
} from "ol-search-ui"
import { imgConfigs } from "../../util/constants"

type EditListMenuProps = {
  id: number
}
const EditListMenu: React.FC<EditListMenuProps> = ({ id }) => {
  const [open, toggleOpen] = useToggle(false)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const handleEdit = useCallback(() => {
    console.log(`Editing list ${id}`)
  }, [id])
  const handleDelete = useCallback(() => {
    console.log(`Deleting list ${id}`)
  }, [id])
  return (
    (
      <>
        <IconButton onClick={toggleOpen.on} ref={setAnchorEl} size="small">
          <MoreVertIcon fontSize="inherit" />
        </IconButton><Menu open={open} onClose={toggleOpen.off} anchorEl={anchorEl}>
          <MenuItem disableRipple onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            Edit
          </MenuItem>
          <MenuItem disableRipple onClick={handleDelete}>
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
  const userListsQuery = useUserListsListing()
  const favoritesQuery = useFavoritesData()
  const favorites = favoritesQuery.data ?
    makeFavorites(favoritesQuery.data.count) :
    null
  return (
    <BannerPage
      src="/static/images/course_search_banner.png"
      alt=""
      compactOnMobile
    >
      <Container>
        <GridContainer>
          <GridColumn variant="main-2-wide-main">
            <h1>My Lists</h1>
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
                          <EditListMenu id={list.id} open={false} />
                        }
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </GridColumn>
        </GridContainer>
      </Container>
    </BannerPage>
  )
}

export default UserListsPage

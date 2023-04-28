import React, { useCallback } from "react"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid"

import { BannerPage } from "ol-util"
import { manageListDialogs } from "./ManageListDialogs"
import { GridColumn, GridContainer } from "../../components/layout"
import {
  useFavoritesListing,
  useUserListsListing
} from "../../api/learning-resources"
import Container from "@mui/material/Container"
import { LearningResourceCardTemplate, TYPE_FAVORITES } from "ol-search-ui"
import type { UserList, Favorites } from "ol-search-ui"
import { imgConfigs } from "../../util/constants"
import { useHistory } from "react-router"
import { FAVORITES_VIEW, makeUserListViewPath } from "../urls"
import EditListMenu from "./EditListMenu"

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
                      <LearningResourceCardTemplate
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
                        <LearningResourceCardTemplate
                          variant="row-reverse"
                          className="ic-resource-card"
                          resource={list}
                          imgConfig={imgConfigs["row-reverse-small"]}
                          footerActionSlot={
                            <EditListMenu
                              resource={list}
                              onEdit={manageListDialogs.editUserList}
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

export default UserListsListingPage

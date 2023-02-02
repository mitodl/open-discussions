import React from "react"
import { BannerPage } from "ol-util"
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
  console.log("favorites", favoritesQuery.data)
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

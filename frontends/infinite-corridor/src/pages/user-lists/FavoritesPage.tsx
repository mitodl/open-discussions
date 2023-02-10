import React from "react"
import { BannerPage } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import { useFavorites } from "../../api/learning-resources"
import Container from "@mui/material/Container"
import { LearningResourceCard } from "ol-search-ui"
import { imgConfigs } from "../../util/constants"
import { useActivateResourceDrawer } from "../LearningResourceDrawer"

const UserListsPage: React.FC = () => {
  const favoritesQuery = useFavorites()
  const favorites = favoritesQuery.data?.results
  const activateResource = useActivateResourceDrawer()

  return (
    <BannerPage
      src="/static/images/course_search_banner.png"
      alt=""
      compactOnMobile
    >
      <Container className="userlist-page">
        <GridContainer>
          <GridColumn variant="main-2-wide-main">
            <h1 className="ic-list-header">My Favorites</h1>
            {favoritesQuery.isLoading && <p>Loading...</p>}
            {favorites &&
              (favorites.length === 0 ? (
                <p className="empty-message">
                  You don't have any favorites yet.
                </p>
              ) : (
                <ul className="ic-card-row-list">
                  {favorites.map(list => {
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
    </BannerPage>
  )
}

export default UserListsPage

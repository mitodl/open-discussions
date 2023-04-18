import React, { useMemo } from "react"
import { BannerPage } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import { useFavoritesListing } from "../../api/learning-resources"
import Container from "@mui/material/Container"
import UserListItems from "./ItemsListing"

const FavoritesPage: React.FC = () => {
  const favoritesQuery = useFavoritesListing()

  const items = useMemo(() => {
    const pages = favoritesQuery.data?.pages
    return pages?.flatMap(p => p.results.map(r => r))
  }, [favoritesQuery.data])

  return (
    <BannerPage
      src="/static/images/course_search_banner.png"
      alt=""
      compactOnMobile
    >
      <Container maxWidth="sm" className="userlist-page">
        <GridContainer>
          <GridColumn variant="single-full">
            <h1 className="ic-list-header">My Favorites</h1>
            <UserListItems
              isLoading={favoritesQuery.isLoading}
              items={items}
              emptyMessage="You don't have any favorites yet."
            />
          </GridColumn>
        </GridContainer>
      </Container>
    </BannerPage>
  )
}

export default FavoritesPage

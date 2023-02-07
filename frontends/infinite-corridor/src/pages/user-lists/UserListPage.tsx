import React from "react"
import { BannerPage } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import { useUserListItems, useUserList } from "../../api/learning-resources"
import Container from "@mui/material/Container"
import { LearningResourceCard } from "ol-search-ui"
import { imgConfigs } from "../../util/constants"
import { useParams } from "react-router"
import { useActivateResourceDrawer } from "../LearningResourceDrawer"

type RouteParams = {
  id: string
}

const UserListsPage: React.FC = () => {
  const id = Number(useParams<RouteParams>().id)
  const userListQuery = useUserList(id)
  const itemsDataQuery = useUserListItems(id)
  const activateResource = useActivateResourceDrawer()

  return (
    <BannerPage
      src="/static/images/course_search_banner.png"
      alt=""
      compactOnMobile
    >
      <Container>
        <GridContainer>
          <GridColumn variant="main-2-wide-main">
            {userListQuery.data && <h1>{userListQuery.data.title}</h1>}
            {itemsDataQuery.isLoading && <p>Loading...</p>}
            {itemsDataQuery.data && (
              <ul className="ic-card-row-list">
                {itemsDataQuery.data.results.map(list => {
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
            )}
          </GridColumn>
        </GridContainer>
      </Container>
    </BannerPage>
  )
}

export default UserListsPage

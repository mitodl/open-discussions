import React from "react"
import { BannerPage } from "ol-util"
import { GridColumn, GridContainer } from "../../components/layout"
import { useUserListsData } from "../../api/learning-resources"
import Container from "@mui/material/Container"
import { LearningResourceCard } from "ol-search-ui"
import { imgConfigs } from "../../util/constants"

const UserListsPage: React.FC = () => {
  const userListsQuery = useUserListsData()
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

import React, { useState } from "react"
import { BannerPage } from "ol-util"
import { GridColumn, GridContainer } from "../components/layout"
import Container from "@mui/material/Container"
import { CkeditorArticle } from "ol-ckeditor"

const ArticlePage: React.FC = () => {
  const [value, setValue] = useState("")
  return (
    <BannerPage
      src="/static/images/course_search_banner.png"
      alt=""
      compactOnMobile
    >
      <Container maxWidth="sm" className="userlist-page">
        <GridContainer>
          <GridColumn variant="single-full">
            <h1>Article Editor Test Page</h1>
            <CkeditorArticle value={value} onChange={setValue} />
          </GridColumn>
        </GridContainer>
      </Container>
    </BannerPage>
  )
}

export default ArticlePage

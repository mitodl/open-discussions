import React, { useState } from "react"
import { BannerPage } from "ol-util"
import { GridColumn, GridContainer } from "../components/layout"
import Container from "@mui/material/Container"
import { CkeditorArticleLazy } from "ol-ckeditor"

const configOverrides = { placeholder: "Write your article here..." }

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
            <CkeditorArticleLazy
              fallbackLines={6}
              className="article-editor"
              value={value}
              onChange={setValue}
              config={configOverrides}
            />
            <h2>Preview</h2>
            <div dangerouslySetInnerHTML={{ __html: value }} />
          </GridColumn>
        </GridContainer>
      </Container>
    </BannerPage>
  )
}

export default ArticlePage

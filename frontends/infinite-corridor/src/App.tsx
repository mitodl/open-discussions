import React from "react"

import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage,
  Cell,
  Grid
} from "ol-util"
import styled from "styled-components"

const Placeholder = styled.div`
  height: 150px;
  border: 1pt solid gray;
`

export const COURSE_BANNER_URL = "/static/images/lawn_and_river_banner.png"

const App = () => {
  return (
    <BannerPageWrapper>
      <BannerPageHeader tall compactOnMobile>
        <BannerContainer>
          <BannerImage src={COURSE_BANNER_URL} tall compactOnMobile />
        </BannerContainer>
      </BannerPageHeader>
      <Grid className="main-content one-column">
        {Array(6)
          .fill(null)
          .map((_x, i) => (
            <Cell key={i} width={3}>
              <Placeholder />
            </Cell>
          ))}
      </Grid>
    </BannerPageWrapper>
  )
}

export default App

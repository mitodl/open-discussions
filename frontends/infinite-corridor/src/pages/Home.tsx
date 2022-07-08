import React, { useCallback, useState } from "react"

import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage,
  Cell,
  Grid,
} from "ol-util"
import styled from "styled-components"
import { Searchbox, SearchboxControlled } from "ol-search-ui"
import { useHistory } from "react-router"

const Placeholder = styled.div`
  height: 150px;
  border: 1pt solid gray;
`

export const COURSE_BANNER_URL = "/static/images/lawn_and_river_banner.png"

const LearningResourceSearchbox = styled(Searchbox)`
  font-size: 20px;
  input[type=text] {
    border-radius: 7px;
  }
`

const HomePage: React.FC = () => {
  const [searchText, setSearchText] = useState("")
  const history = useHistory()
  const onSearchClear = useCallback(() => setSearchText(""), [])
  const onSearchChange: SearchboxControlled["onChange"] = useCallback(e => {
    setSearchText(e.target.value)
  }, [])
  const onSearchSubmit = useCallback(() => {
    history.push(`/infinite/search?q=${searchText}`)
  }, [searchText, history])
  return (
    <BannerPageWrapper>
      <BannerPageHeader tall compactOnMobile>
        <BannerContainer>
          <BannerImage src={COURSE_BANNER_URL} tall compactOnMobile />
        </BannerContainer>
        <LearningResourceSearchbox
          value={searchText}
          onSubmit={onSearchSubmit}
          onClear={onSearchClear}
          onChange={onSearchChange}
        >
          <div className="d-flex justify-content-end mt-3">
            <button className="me-0 ol-btn" onClick={onSearchSubmit}>
              Explore
            </button>
          </div>
        </LearningResourceSearchbox>
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

export default HomePage

import React, { useCallback, useState } from "react"

import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "ol-util"
import styled from "styled-components"
import { Searchbox, SearchboxControlled } from "ol-search-ui"
import { useHistory } from "react-router"
import { Link } from "react-router-dom"
import { useFieldsList } from "../api/fields"
import * as urls from "./urls"

export const COURSE_BANNER_URL = "/static/images/lawn_and_river_banner.png"

const LearningResourceSearchbox = styled(Searchbox)`
  font-size: 20px;
  input[type="text"] {
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

  const fieldsList = useFieldsList()

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
      <div className="mdc-layout-grid one-column">
        <h2>MIT Fields</h2>
        <ul>
          {fieldsList.data?.results.map(field => (
            <li key={field.name}>
              <Link to={urls.makeFieldViewPath(field.name)}>{field.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </BannerPageWrapper>
  )
}

export default HomePage

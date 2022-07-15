import React, { useCallback, useState } from "react"

import styled from "styled-components"
import { Searchbox, SearchboxControlled } from "ol-search-ui"
import { useHistory } from "react-router"
import { Link } from "react-router-dom"
import { useFieldsList } from "../api/fields"
import * as urls from "./urls"

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
    <div>
        <LearningResourceSearchbox
          value={searchText}
          onSubmit={onSearchSubmit}
          onClear={onSearchClear}
          onChange={onSearchChange}
        />
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
    </div>
  )
}

export default HomePage

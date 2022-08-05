import React, { useCallback, useState } from "react"
import { SearchInput, SearchInputProps } from "ol-search-ui"
import { useHistory } from "react-router"
import { Link } from "react-router-dom"
import { useFieldsList } from "../api/fields"
import * as urls from "./urls"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"

const HomePage: React.FC = () => {
  const [searchText, setSearchText] = useState("")
  const history = useHistory()
  const onSearchClear = useCallback(() => setSearchText(""), [])
  const onSearchChange: SearchInputProps["onChange"] = useCallback(e => {
    setSearchText(e.target.value)
  }, [])
  const onSearchSubmit = useCallback(() => {
    const params = new URLSearchParams([["q", searchText]]).toString()
    history.push(`/infinite/search?${params}`)
  }, [searchText, history])

  const fieldsList = useFieldsList()

  return (
    <Container className="homepage">
      <h1 className="page-title">Lorem ipsum dolor sit amet</h1>
      <SearchInput
        value={searchText}
        placeholder="Search for online courses or programs at MIT"
        onSubmit={onSearchSubmit}
        onClear={onSearchClear}
        onChange={onSearchChange}
        className="homepage-search main-search"
        classNameSubmit="primary bordered"
      />
      <section>
        <h2 className="page-subtitle">
          Lorem ipsum dolor sit amet consectetur adipiscing
        </h2>
        <Grid
          columns={10}
          container
          justifyContent="center"
          component="ul"
          className="field-list"
        >
          {fieldsList.data?.results.map(field => (
            <Grid item xs={3} md={2} component="li" key={field.name}>
              <Link
                className="field-link"
                to={urls.makeFieldViewPath(field.name)}
              >
                <figure>
                  <img src={field.avatar_medium ?? ""} />
                  <figcaption className="field-title">{field.title}</figcaption>
                </figure>
              </Link>
            </Grid>
          ))}
        </Grid>
      </section>
    </Container>
  )
}

export default HomePage

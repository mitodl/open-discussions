import React, { useCallback, useState } from "react"
import { SearchInput, SearchInputProps } from "ol-search-ui"
import { useHistory } from "react-router"
import { Link } from "react-router-dom"
import Container from "@mui/material/Container"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid"
import { GridContainer } from "../components/layout"

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

  return (
    <Container className="homepage">
      <GridContainer>
        <div className="background-gradient"></div>
        <Grid item xs={12} md={7}>
          <h1 className="page-title">Learn from MIT</h1>
          <h2 className="page-subtitle">
            Search for MIT courses, videos, podcasts, learning paths, and
            communities
          </h2>
          <SearchInput
            value={searchText}
            placeholder="What do you want to learn?"
            onSubmit={onSearchSubmit}
            onClear={onSearchClear}
            onChange={onSearchChange}
            className="homepage-search main-search"
          />
          <div>
            <h3 className="search-buttons-container-label">Explore</h3>
            <div className="search-buttons-container">
              <Button
                component={Link}
                to="/infinite/search?type=course"
                variant="outlined"
                className="homepage-button"
              >
                Courses
              </Button>
              <Button
                component={Link}
                to="/infinite/search"
                variant="outlined"
                className="homepage-button"
              >
                Videos
              </Button>
              <Button
                component={Link}
                to="/infinite/search"
                variant="outlined"
                className="homepage-button"
              >
                Podcasts
              </Button>
              <Button
                component={Link}
                to="/infinite/search"
                variant="outlined"
                className="homepage-button"
              >
                Learning Paths
              </Button>
              <Button
                component={Link}
                to="/infinite/search"
                variant="outlined"
                className="homepage-button"
              >
                By Department
              </Button>
              <Button
                component={Link}
                to="/infinite/search"
                variant="outlined"
                className="homepage-button"
              >
                By Subject
              </Button>
              <Button
                component={Link}
                to="/infinite/search?o=OCW"
                variant="outlined"
                className="homepage-button"
              >
                From OCW
              </Button>
              <Button
                component={Link}
                to="/infinite/search?o=MITx"
                variant="outlined"
                className="homepage-button"
              >
                From MITx
              </Button>
              <Button
                component={Link}
                to="/infinite/search?c=Certificates"
                variant="outlined"
                className="homepage-button"
              >
                With Certificate
              </Button>
              <Button
                component={Link}
                to="/infinite/search"
                variant="outlined"
                className="homepage-button"
              >
                Micromasters
              </Button>
              <Button
                component={Link}
                to="/infinite/search?o=Professional%20Education"
                variant="outlined"
                className="homepage-button"
              >
                Professional Education
              </Button>
            </div>
          </div>
        </Grid>
        <Grid item xs={12} md={5}>
          <div>
            <img
              className="frontpage-image-decoration"
              alt="Photos from the MIT campus arranged to form the letter M"
              src="/static/images/infinite-front-page-image.png"
            />
          </div>
        </Grid>
      </GridContainer>
    </Container>
  )
}

export default HomePage

import React, { useCallback, useState } from "react"
import { SearchInput, SearchInputProps, LearningResource } from "ol-search-ui"
import { useHistory } from "react-router"
import { Link } from "react-router-dom"
import Container from "@mui/material/Container"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid"
import { GridColumn, GridContainer } from "../components/layout"
import {
  useUpcomingCourses,
  usePopularContent,
  useNewVideos
} from "../api/learning-resources"
import { TitledCarousel, useMuiBreakpoint } from "ol-util"
import ArrowBack from "@mui/icons-material/ArrowBack"
import ArrowForward from "@mui/icons-material/ArrowForward"
import LearningResourceCard from "../components/LearningResourceCard"
import TabContext from "@mui/lab/TabContext"
import Tab from "@mui/material/Tab"
import TabPanel from "@mui/lab/TabPanel"
import TabList from "@mui/lab/TabList"
import type { PaginatedResult } from "ol-util"
import { UseQueryResult } from "@tanstack/react-query"

interface HomePageCarouselProps {
  query: UseQueryResult<PaginatedResult<LearningResource>>
  showNavigationButtons?: boolean
}

const HomePageCarousel: React.FC<HomePageCarouselProps> = ({
  query,
  showNavigationButtons = true
}) => {
  const items = query.data?.results ?? []
  const aboveSm = useMuiBreakpoint("sm")
  const aboveLg = useMuiBreakpoint("lg")
  const pageSize = aboveLg ? 4 : aboveSm ? 2 : 1

  return (
    <TitledCarousel
      as="section"
      carouselClassName="ic-carousel"
      headerClassName="ic-carousel-header"
      pageSize={pageSize}
      cellSpacing={0} // we'll handle it with css
      previous={
        <Button
          variant="outlined"
          color="secondary"
          endIcon={<ArrowBack fontSize="inherit" />}
          className="ic-carousel-button-prev"
        >
          Previous
        </Button>
      }
      next={
        <Button
          variant="outlined"
          color="secondary"
          endIcon={<ArrowForward fontSize="inherit" />}
          className="ic-carousel-button-next"
        >
          Next
        </Button>
      }
      showNavigationButtons={showNavigationButtons}
    >
      {items.map(item => (
        <LearningResourceCard
          key={item.id}
          className="ic-resource-card ic-carousel-card"
          resource={item}
          variant="column"
        />
      ))}
    </TitledCarousel>
  )
}

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

  const upcomingCourseQuery = useUpcomingCourses()
  const upcomingMicormastersCourseQuery = useUpcomingCourses({
    offered_by: "Micromasters"
  })
  const upcomingProfessionalCourseQuery = useUpcomingCourses()
  const upcomingCertificateCourseQuery = useUpcomingCourses()
  const popularContentQuery = usePopularContent()
  const newVideosQuery = useNewVideos()

  const [tabValue, setTabValue] = React.useState("all")

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue)
  }

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
      <TabContext value={tabValue}>
        <GridContainer>
          <GridColumn variant="single-full">
            <h3>Upcoming Courses</h3>
            <TabList className="courses-nav" onChange={handleChange}>
              <Tab label="All" value="all" />
              <Tab label="Certificate" value="certificate" />
              <Tab label="Micromasters" value="micromasters" />
              <Tab label="Professional ed" value="professional" />
            </TabList>
            <TabPanel value="all" className="courses-carusel">
              <HomePageCarousel query={upcomingCourseQuery} />
            </TabPanel>
            <TabPanel value="certificate" className="courses-carusel">
              <HomePageCarousel query={upcomingCertificateCourseQuery} />
            </TabPanel>
            <TabPanel value="micromasters" className="courses-carusel">
              <HomePageCarousel query={upcomingMicormastersCourseQuery} />
            </TabPanel>
            <TabPanel value="professional" className="courses-carusel">
              <HomePageCarousel query={upcomingProfessionalCourseQuery} />
            </TabPanel>
          </GridColumn>
        </GridContainer>
      </TabContext>
      <GridContainer>
        <GridColumn variant="single-full">
          <h3>Popular Learning Resources</h3>
          <HomePageCarousel query={popularContentQuery} />
        </GridColumn>
      </GridContainer>
      <GridContainer>
        <GridColumn variant="single-full">
          <h3>New Videos From MIT</h3>
          <HomePageCarousel query={newVideosQuery} />
        </GridColumn>
      </GridContainer>
      <GridContainer>
        <GridColumn variant="single-full" className="professional-grid-column">
          <h2 className="professional-title">
            Upcoming Professional Education Courses
          </h2>
          <HomePageCarousel
            query={upcomingProfessionalCourseQuery}
            showNavigationButtons={false}
          />
        </GridColumn>
        <GridColumn
          variant="single-full"
          className="professional-button-container"
        >
          <Button
            component={Link}
            to="/infinite/search?type=course"
            variant="outlined"
            className="professional-button"
          >
            Explore All Professional Courses
          </Button>
        </GridColumn>
        <div className="professional-box">
          <img src="/static/images/professional_education_background.png" />
        </div>
      </GridContainer>
    </Container>
  )
}

export default HomePage

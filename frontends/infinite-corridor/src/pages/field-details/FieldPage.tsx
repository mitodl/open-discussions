import React, { useCallback } from "react"
import { useParams, useLocation, useHistory } from "react-router"
import Tab from "@mui/material/Tab"
import TabContext from "@mui/lab/TabContext"
import TabList from "@mui/lab/TabList"
import TabPanel from "@mui/lab/TabPanel"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import useMediaQuery from "@mui/material/useMediaQuery"
import type { Theme } from "@mui/material/styles"
import { LearningResourceCard } from "ol-search-ui"
import { TitledCarousel } from "ol-util"
import { Link } from "react-router-dom"
import FieldPageSkeleton from "./FieldPageSkeleton"
import ArrowForward from "@mui/icons-material/ArrowForward"
import ArrowBack from "@mui/icons-material/ArrowBack"
import { useFieldDetails, useFieldListItems, UserList } from "../../api/fields"
import { imgConfigs } from "../../util/constants"
import WidgetsList from "./WidgetsList"

type RouteParams = {
  name: string
}

const keyFromHash = (hash: string) => {
  const keys = ["home", "about"]
  const match = keys.find(key => `#${key}` === hash)
  return match ?? "home"
}
interface FieldListProps {
  list: UserList
}

const FieldList: React.FC<FieldListProps> = ({ list }) => {
  const itemsQuery = useFieldListItems(list.id)
  const items = itemsQuery.data?.results ?? []
  return (
    <section>
      <h3>{list.title}</h3>
      <ul className="ic-card-row-list">
        {items.map(item => (
          <li key={item.id}>
            <LearningResourceCard
              variant="row-reverse"
              className="ic-resource-card"
              resource={item}
              imgConfig={imgConfigs["row-reverse"]}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

const FieldCarousel: React.FC<FieldListProps> = ({ list }) => {
  const itemsQuery = useFieldListItems(list.id)
  const items = itemsQuery.data?.results ?? []
  const matches = useMediaQuery<Theme>(theme => theme.breakpoints.up("sm"))
  const pageSize = matches ? 3 : 1
  return (
    <TitledCarousel
      as="section"
      carouselClassName="ic-carousel"
      headerClassName="ic-carousel-header"
      pageSize={pageSize}
      cellSpacing={0} // we'll handle it with css
      title={<h3>{list.title}</h3>}
      previous={
        <button
          type="button"
          className="ic-carousel-button-prev outlined-button"
        >
          <ArrowBack fontSize="inherit" /> Previous
        </button>
      }
      next={
        <button
          type="button"
          className="ic-carousel-button-next outlined-button"
        >
          Next <ArrowForward fontSize="inherit" />
        </button>
      }
    >
      {items.map(item => (
        <LearningResourceCard
          key={item.id}
          className="ic-resource-card ic-carousel-card"
          resource={item}
          imgConfig={imgConfigs["column"]}
        />
      ))}
    </TitledCarousel>
  )
}

const FieldPage: React.FC = () => {
  const { name } = useParams<RouteParams>()
  const history = useHistory()
  const { hash, pathname } = useLocation()
  const tabValue = keyFromHash(hash)
  const fieldQuery = useFieldDetails(name)
  const handleChange = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      history.replace({ hash: newValue })
    },
    [history]
  )

  const featuredList = fieldQuery.data?.featured_list
  const fieldLists = fieldQuery.data?.lists ?? []
  const isEditingWidgets = pathname.endsWith("manage/widgets")
  return (
    <FieldPageSkeleton name={name}>
      <TabContext value={tabValue}>
        <div className="page-subbanner">
          <Container>
            <Grid container>
              <Grid item xs={12} sm={9}>
                <TabList className="page-nav" onChange={handleChange}>
                  <Tab component={Link} to="#" label="Home" value="home" />
                  <Tab
                    component={Link}
                    to="#about"
                    label="About"
                    value="about"
                  />
                </TabList>
              </Grid>
            </Grid>
          </Container>
        </div>
        <Container>
          <Grid container>
            <Grid item xs={12} sm={9}>
              <TabPanel value="home" className="page-nav-content">
                <p>{fieldQuery.data?.public_description}</p>
                {featuredList && <FieldCarousel list={featuredList} />}
                {fieldLists.map(list => (
                  <FieldList key={list.id} list={list} />
                ))}
              </TabPanel>
              <TabPanel value="about" className="page-nav-content"></TabPanel>
            </Grid>
            <Grid item xs={12} sm={3} className="ic-sidebar">
              <WidgetsList widgetListId={fieldQuery.data?.widget_list} isEditing={isEditingWidgets} />
            </Grid>
          </Grid>
        </Container>
      </TabContext>
    </FieldPageSkeleton>
  )
}

export default FieldPage

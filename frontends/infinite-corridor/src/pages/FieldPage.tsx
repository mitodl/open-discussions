import React, { useCallback } from "react"
import { useParams, useLocation } from "react-router"
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
import { useFieldDetails, useFieldListItems, UserList } from "../api/fields"
import { Link } from "react-router-dom"
import FieldPageSkeleton from "./FieldPageSkeleton"
import IconButton from "@mui/material/IconButton"
import NavigateNextIcon from "@mui/icons-material/NavigateNext"
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore"
import { imgConfigs } from "../util/constants"

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
      pageSize={pageSize}
      cellSpacing={0} // we'll handle it with css
      title={<h3>{list.title}</h3>}
      previous={
        <IconButton
          title="Show previous courses"
          className="ic-carousel-button"
        >
          <NavigateBeforeIcon />
        </IconButton>
      }
      next={
        <IconButton title="Show next courses" className="ic-carousel-button">
          <NavigateNextIcon />
        </IconButton>
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
  const { hash } = useLocation()

  const [value, setValue] = React.useState(keyFromHash(hash))
  const fieldQuery = useFieldDetails(name)
  const handleChange = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      setValue(newValue)
    },
    []
  )

  const featuredList = fieldQuery.data?.featured_list
  const fieldLists = fieldQuery.data?.lists ?? []

  return (
    <FieldPageSkeleton name={name}>
      <TabContext value={value}>
        <div className="page-subbanner">
          <Container>
            <Grid container spacing={1}>
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
          <Grid container spacing={1}>
            <Grid item xs={12} sm={9}>
              <TabPanel value="home" className="page-nav-content">
                <p>{fieldQuery.data?.public_description}</p>
                {featuredList && <FieldCarousel list={featuredList} />}
                {fieldLists.map(list => (
                  <FieldList key={list.id} list={list} />
                ))}
              </TabPanel>
              <TabPanel value="about" className="page-nav-content">
                At vero eos et accusamus et iusto odio dignissimos ducimus qui
                blanditiis praesentium voluptatum deleniti atque corrupti quos
                dolores et quas molestias excepturi sint occaecati cupiditate
                non provident, similique sunt in culpa qui officia deserunt
                mollitia animi, id est laborum et dolorum fuga. Et harum quidem
                rerum facilis est et expedita distinctio. Nam libero tempore,
                cum soluta nobis est eligendi optio cumque nihil impedit quo
                minus id quod maxime placeat facere possimus, omnis voluptas
                assumenda est, omnis dolor repellendus. Temporibus autem
                quibusdam et aut officiis debitis aut rerum necessitatibus saepe
                eveniet ut et voluptates repudiandae sint et molestiae non
                recusandae. Itaque earum rerum hic tenetur a sapiente delectus,
                ut aut reiciendis voluptatibus maiores alias consequatur aut
                perferendis doloribus asperiores repellat.
              </TabPanel>
            </Grid>
          </Grid>
        </Container>
      </TabContext>
    </FieldPageSkeleton>
  )
}

export default FieldPage

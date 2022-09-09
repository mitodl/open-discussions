import React, { useState, useCallback } from "react"
import { useParams, useLocation, useHistory } from "react-router"
import Tab from "@mui/material/Tab"
import TabContext from "@mui/lab/TabContext"
import TabList from "@mui/lab/TabList"
import TabPanel from "@mui/lab/TabPanel"
import Container from "@mui/material/Container"
import {
  LearningResourceCard,
  LearningResourceDrawer,
  useGetResourceIdentifiersFromUrl,
  ResourceIdentifiers
} from "ol-search-ui"
import { TitledCarousel, useMuiBreakpoint } from "ol-util"
import { Link } from "react-router-dom"
import FieldPageSkeleton from "./FieldPageSkeleton"
import ArrowForward from "@mui/icons-material/ArrowForward"
import ArrowBack from "@mui/icons-material/ArrowBack"
import { useFieldDetails, useFieldListItems, UserList } from "../../api/fields"
import { imgConfigs } from "../../util/constants"
import WidgetsList from "./WidgetsList"
import { GridColumn, GridContainer } from "../../components/layout"

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
  setDrawerObject: (params: ResourceIdentifiers | null) => void
}

const FieldList: React.FC<FieldListProps> = ({ list, setDrawerObject }) => {
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
              toggleDrawer={setDrawerObject}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

const FieldCarousel: React.FC<FieldListProps> = ({ list, setDrawerObject }) => {
  const itemsQuery = useFieldListItems(list.id)
  const items = itemsQuery.data?.results ?? []
  const isMd = useMuiBreakpoint("md")
  const isLg = useMuiBreakpoint("lg")
  const pageSize = isLg ? 3 : isMd ? 2 : 1
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
          toggleDrawer={setDrawerObject}
        />
      ))}
    </TitledCarousel>
  )
}

const MANAGE_WIDGETS_SUFFIX = "manage/widgets/"

const FieldPage: React.FC = () => {
  const { name } = useParams<RouteParams>()

  const history = useHistory()
  const { hash, pathname } = useLocation()
  const tabValue = keyFromHash(hash)
  const fieldQuery = useFieldDetails(name)
  const handleChange = useCallback(
    (_event: React.SyntheticEvent, newValue: string) => {
      history.replace({ hash: newValue })
    },
    [history]
  )

  const featuredList = fieldQuery.data?.featured_list
  const fieldLists = fieldQuery.data?.lists ?? []
  const isEditingWidgets = pathname.endsWith(MANAGE_WIDGETS_SUFFIX)

  const leaveWidgetManagement = useCallback(() => {
    const { pathname } = history.location
    history.replace({
      pathname: pathname.slice(0, -MANAGE_WIDGETS_SUFFIX.length)
    })
  }, [history])
  const [drawerObject, setDrawerObject] = useState<ResourceIdentifiers | null>(
    useGetResourceIdentifiersFromUrl() as ResourceIdentifiers
  )

  return (
    <FieldPageSkeleton name={name}>
      <TabContext value={tabValue}>
        <div className="page-subbanner">
          <Container>
            <GridContainer>
              <GridColumn variant="main-2">
                <TabList className="page-nav" onChange={handleChange}>
                  <Tab component={Link} to="#" label="Home" value="home" />
                  <Tab
                    component={Link}
                    to="#about"
                    label="About"
                    value="about"
                  />
                </TabList>
              </GridColumn>
              <GridColumn variant="sidebar-2" />
            </GridContainer>
          </Container>
        </div>
        <Container>
          <GridContainer>
            <GridColumn variant="main-2">
              <TabPanel value="home" className="page-nav-content">
                <p>{fieldQuery.data?.public_description}</p>
                {featuredList && (
                  <FieldCarousel
                    list={featuredList}
                    setDrawerObject={setDrawerObject}
                  />
                )}
                {fieldLists.map(list => (
                  <FieldList
                    key={list.id}
                    list={list}
                    setDrawerObject={setDrawerObject}
                  />
                ))}
              </TabPanel>
              <TabPanel value="about" className="page-nav-content"></TabPanel>
            </GridColumn>
            <GridColumn variant="sidebar-2">
              {fieldQuery.data?.widget_list && (
                <WidgetsList
                  className="ic-widget-list"
                  widgetListId={fieldQuery.data.widget_list}
                  isEditing={isEditingWidgets}
                  onFinishEditing={leaveWidgetManagement}
                />
              )}
            </GridColumn>
          </GridContainer>
        </Container>
      </TabContext>
      <LearningResourceDrawer
        drawerObject={drawerObject}
        setDrawerObject={setDrawerObject}
      />
    </FieldPageSkeleton>
  )
}

export default FieldPage

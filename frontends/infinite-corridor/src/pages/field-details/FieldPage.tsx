import React, { useCallback } from "react"
import { useParams, useLocation, useHistory } from "react-router"
import Tab from "@mui/material/Tab"
import TabContext from "@mui/lab/TabContext"
import TabList from "@mui/lab/TabList"
import TabPanel from "@mui/lab/TabPanel"
import Container from "@mui/material/Container"
import { LearningResourceCard } from "ol-search-ui"
import type { OnActivateCard, UserList } from "ol-search-ui"
import { TitledCarousel, useMuiBreakpoint } from "ol-util"
import { Link } from "react-router-dom"
import FieldPageSkeleton from "./FieldPageSkeleton"
import ArrowForward from "@mui/icons-material/ArrowForward"
import ArrowBack from "@mui/icons-material/ArrowBack"
import { useFieldDetails } from "../../api/fields"
import { useUserListItems } from "../../api/learning-resources"
import { imgConfigs } from "../../util/constants"
import WidgetsList from "./WidgetsList"
import { GridColumn, GridContainer } from "../../components/layout"
import { useActivateResourceDrawer } from "../LearningResourceDrawer"

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
  onActivateCard: OnActivateCard
}

const FieldList: React.FC<FieldListProps> = ({ list, onActivateCard }) => {
  const itemsQuery = useUserListItems(list.id)
  const items = itemsQuery.data?.results.map(r => r.content_data) ?? []
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
              onActivate={onActivateCard}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

const FieldCarousel: React.FC<FieldListProps> = ({ list, onActivateCard }) => {
  const itemsQuery = useUserListItems(list.id)
  const items = itemsQuery.data?.results.map(r => r.content_data) ?? []
  const isSm = useMuiBreakpoint("sm")
  const isLg = useMuiBreakpoint("lg")
  const pageSize = isLg ? 3 : isSm ? 2 : 1
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
          onActivate={onActivateCard}
        />
      ))}
    </TitledCarousel>
  )
}

const MANAGE_WIDGETS_SUFFIX = "manage/widgets/"

const FieldPage: React.FC = () => {
  const { name } = useParams<RouteParams>()
  const activateResource = useActivateResourceDrawer()
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

  return (
    <FieldPageSkeleton name={name}>
      <TabContext value={tabValue}>
        <div className="page-subbanner">
          <Container>
            <GridContainer>
              <GridColumn variant="main-2-wide-main">
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
              <GridColumn variant="sidebar-2-wide-main" />
            </GridContainer>
          </Container>
        </div>
        <Container>
          <GridContainer>
            <GridColumn variant="main-2-wide-main">
              <TabPanel value="home" className="page-nav-content">
                <p>{fieldQuery.data?.public_description}</p>
                {featuredList && (
                  <FieldCarousel
                    list={featuredList}
                    onActivateCard={activateResource}
                  />
                )}
                {fieldLists.map(list => (
                  <FieldList
                    key={list.id}
                    list={list}
                    onActivateCard={activateResource}
                  />
                ))}
              </TabPanel>
              <TabPanel value="about" className="page-nav-content"></TabPanel>
            </GridColumn>
            <GridColumn variant="sidebar-2-wide-main">
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
    </FieldPageSkeleton>
  )
}

export default FieldPage

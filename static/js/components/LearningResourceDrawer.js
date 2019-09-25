// @flow
import React from "react"
import R from "ramda"
import _ from "lodash"
import { connect } from "react-redux"
import { withRouter } from "react-router"
import { Drawer, DrawerContent } from "rmwc/Drawer"
import { Theme } from "rmwc/Theme"
import { querySelectors } from "redux-query"
import { connectRequest } from "redux-query-react"
import { createSelector } from "reselect"

import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"

import { setShowResourceDrawer } from "../actions/ui"
import { getViewportWidth } from "../lib/util"
import { courseRequest } from "../lib/queries/courses"
import { bootcampRequest } from "../lib/queries/bootcamps"
import { programRequest } from "../lib/queries/programs"
import { userListRequest } from "../lib/queries/user_lists"
import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST
} from "../lib/constants"

import type { Dispatch } from "redux"
import type {
  Bootcamp,
  Course,
  Program,
  UserList
} from "../flow/discussionTypes"

type Props = {
  showLearningDrawer: boolean,
  dispatch: Dispatch<*>,
  object: Course | Bootcamp | Program | UserList | null,
  objectId: number,
  objectType: string,
  runId: number,
  setShowResourceDrawer: Function
}

export class LearningResourceDrawer extends React.Component<Props> {
  width: number

  constructor(props: Props) {
    super(props)
    this.width = getViewportWidth()
  }

  componentDidMount() {
    window.addEventListener("resize", () => this.onResize())
  }

  onResize() {
    // this setState call forces a re-render of the component
    // to ensure that the drawer is responsive
    this.setState({})
  }

  render() {
    const {
      object,
      objectType,
      runId,
      showLearningDrawer,
      setShowResourceDrawer
    } = this.props

    const onDrawerClose = () => setShowResourceDrawer({ objectId: null })

    return object ? (
      <Theme>
        <Drawer
          persistent={false}
          temporary={true}
          open={showLearningDrawer}
          onClose={onDrawerClose}
          dir="rtl"
          className="align-right"
        >
          <DrawerContent dir="ltr" className="alignRight">
            <div className="drawer-close" onClick={onDrawerClose}>
              <i className="material-icons clear">clear</i>
            </div>
            <ExpandedLearningResourceDisplay
              object={object}
              objectType={objectType}
              runId={runId}
              setShowResourceDrawer={setShowResourceDrawer}
            />
            <div className="footer" />
          </DrawerContent>
        </Drawer>
      </Theme>
    ) : null
  }
}

const getObject = createSelector(
  state => state.ui,
  state => state.entities.courses,
  state => state.entities.bootcamps,
  state => state.entities.programs,
  state => state.entities.userLists,
  state => state.queries,
  (ui, courses, bootcamps, programs, userlists, queries) => {
    const { objectId, objectType } = ui.courseDetail

    switch (objectType) {
    case LR_TYPE_COURSE:
      return querySelectors.isFinished(queries, courseRequest(objectId))
        ? courses[objectId]
        : null
    case LR_TYPE_BOOTCAMP:
      return querySelectors.isFinished(queries, bootcampRequest(objectId))
        ? bootcamps[objectId]
        : null
    case LR_TYPE_PROGRAM:
      return querySelectors.isFinished(queries, programRequest(objectId))
        ? programs[objectId]
        : null
    case LR_TYPE_USERLIST:
      return querySelectors.isFinished(queries, userListRequest(objectId))
        ? userlists[objectId]
        : null
    }
  }
)

export const mapStateToProps = (state: Object) => {
  const { ui } = state

  const objectId = ui.courseDetail.objectId
  const objectType = ui.courseDetail.objectType
  const runId = ui.courseDetail.runId

  return {
    showLearningDrawer: _.isFinite(state.ui.courseDetail.objectId),
    objectId,
    objectType,
    runId,
    object:             getObject(state)
  }
}

const mapDispatchToProps = {
  setShowResourceDrawer
}

const mapPropsToConfig = props => {
  const { objectType, objectId } = props

  switch (objectType) {
  case LR_TYPE_COURSE:
    return [courseRequest(objectId)]
  case LR_TYPE_BOOTCAMP:
    return [bootcampRequest(objectId)]
  case LR_TYPE_PROGRAM:
    return [programRequest(objectId)]
  case LR_TYPE_USERLIST:
    return [userListRequest(objectId)]
  }
  return []
}

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withRouter,
  connectRequest(mapPropsToConfig)
)(LearningResourceDrawer)

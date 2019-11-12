// @flow
import React from "react"
import R from "ramda"
import _ from "lodash"
import { connect } from "react-redux"
import { withRouter } from "react-router"
import { Drawer, DrawerContent } from "@rmwc/drawer"
import { Theme } from "@rmwc/theme"
import { querySelectors } from "redux-query"
import { connectRequest } from "redux-query-react"
import { createSelector } from "reselect"

import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"

import { setShowResourceDrawer } from "../actions/ui"
import { courseRequest } from "../lib/queries/courses"
import { bootcampRequest } from "../lib/queries/bootcamps"
import { programRequest } from "../lib/queries/programs"
import { videoRequest } from "../lib/queries/videos"
import { embedlyRequest, getEmbedlys } from "../lib/queries/embedly"
import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_VIDEO
} from "../lib/constants"
import { useResponsive } from "../hooks/util"

import type { Dispatch } from "redux"

type Props = {
  showLearningDrawer: boolean,
  dispatch: Dispatch<*>,
  object: Object | null,
  objectId: number,
  objectType: string,
  runId: number,
  setShowResourceDrawer: Function,
  embedly: ?Object
}

export function LearningResourceDrawer(props: Props) {
  const {
    object,
    runId,
    showLearningDrawer,
    setShowResourceDrawer,
    embedly
  } = props

  useResponsive()

  const onDrawerClose = () => setShowResourceDrawer({ objectId: null })

  return object ? (
    <Theme>
      <Drawer
        open={showLearningDrawer}
        onClose={onDrawerClose}
        dir="rtl"
        className="align-right"
        modal
      >
        <DrawerContent dir="ltr">
          <div className="drawer-close" onClick={onDrawerClose}>
            <i className="material-icons clear">clear</i>
          </div>
          <ExpandedLearningResourceDisplay
            object={object}
            runId={runId}
            setShowResourceDrawer={setShowResourceDrawer}
            embedly={embedly}
          />
          <div className="footer" />
        </DrawerContent>
      </Drawer>
    </Theme>
  ) : null
}

const getObject = createSelector(
  state => state.ui,
  state => state.entities.courses,
  state => state.entities.bootcamps,
  state => state.entities.programs,
  state => state.entities.videos,
  state => state.queries,
  (ui, courses, bootcamps, programs, videos, queries) => {
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
    case LR_TYPE_VIDEO:
      return querySelectors.isFinished(queries, videoRequest(objectId))
        ? videos[objectId]
        : null
    }
  }
)

const getEmbedlyForObject = createSelector(
  getObject,
  getEmbedlys,
  state => state.queries,
  (object, embedlys, queries) => {
    if (!object || object.object_type !== LR_TYPE_VIDEO || !object.url) {
      return null
    }

    return querySelectors.isFinished(queries, embedlyRequest(object.url))
      ? embedlys[object.url]
      : null
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
    object:             getObject(state),
    embedly:            getEmbedlyForObject(state)
  }
}

const mapDispatchToProps = {
  setShowResourceDrawer
}

const mapPropsToConfig = props => {
  const { objectType, objectId, object } = props

  switch (objectType) {
  case LR_TYPE_COURSE:
    return [courseRequest(objectId)]
  case LR_TYPE_BOOTCAMP:
    return [bootcampRequest(objectId)]
  case LR_TYPE_PROGRAM:
    return [programRequest(objectId)]
  case LR_TYPE_VIDEO:
    return [
      videoRequest(objectId),
      ...(object && object.url ? [embedlyRequest(object.url)] : [])
    ]
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

// @flow
import React from "react"
import R from "ramda"
import _ from "lodash"
import { connect } from "react-redux"
import { withRouter } from "react-router"
import { Drawer, DrawerContent } from "@rmwc/drawer"
import { Theme } from "@rmwc/theme"
import { connectRequest } from "redux-query-react"

import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"

import { setShowResourceDrawer } from "../actions/ui"
import { courseRequest } from "../lib/queries/courses"
import { bootcampRequest } from "../lib/queries/bootcamps"
import { programRequest } from "../lib/queries/programs"
import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM
} from "../lib/constants"
import { useResponsive } from "../hooks/util"

import type { Dispatch } from "redux"
import { getQuerySelector } from "../lib/queries/learning_resources"

type Props = {
  showLearningDrawer: boolean,
  dispatch: Dispatch<*>,
  object: Object | null,
  objectId: number,
  objectType: string,
  runId: number,
  setShowResourceDrawer: Function
}

export function LearningResourceDrawer(props: Props) {
  const { object, runId, showLearningDrawer, setShowResourceDrawer } = props

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
          />
          <div className="footer" />
        </DrawerContent>
      </Drawer>
    </Theme>
  ) : null
}

export const mapStateToProps = (state: Object) => {
  const { ui } = state

  const objectId = ui.courseDetail.objectId
  const objectType = ui.courseDetail.objectType
  const runId = ui.courseDetail.runId
  const resourceFilter = getQuerySelector(state, {
    id:          objectId,
    object_type: objectType
  })

  return {
    showLearningDrawer: _.isFinite(state.ui.courseDetail.objectId),
    objectId,
    objectType,
    runId,
    object:             resourceFilter(state)
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

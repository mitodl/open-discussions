// @flow
import React from "react"
import R from "ramda"
import _ from "lodash"
import { connect } from "react-redux"
import { withRouter } from "react-router"
import { Drawer, DrawerContent } from "rmwc/Drawer"
import { Theme } from "rmwc/Theme"

import type { Dispatch } from "redux"
import type { Bootcamp, Course } from "../flow/discussionTypes"
import ExpandedCourseDisplay from "../components/ExpandedCourseDisplay"

import { actions } from "../actions"
import { setShowLearningResourceDrawer } from "../actions/ui"
import { getViewportWidth } from "../lib/util"

type Props = {
  showLearningDrawer: boolean,
  dispatch: Dispatch<*>,
  object: Course | Bootcamp | null,
  objectId: number,
  objectType: string
}

const shouldLoadData = R.complement(
  R.allPass([
    // if course id's don't match
    R.eqProps("objectId"),
    // courses don't match
    R.eqProps("object")
  ])
)

export class LearningResourceDrawer extends React.Component<Props> {
  width: number

  constructor(props: Props) {
    super(props)
    this.width = getViewportWidth()
  }

  componentDidMount() {
    const { objectId } = this.props
    window.addEventListener("resize", () => this.onResize())
    if (objectId) {
      this.loadData()
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { objectId } = this.props
    if (objectId && shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { dispatch, objectId, objectType } = this.props
    switch (objectType) {
    case "course":
      dispatch(actions.courses.get(objectId))
      break
    case "bootcamp":
      dispatch(actions.bootcamps.get(objectId))
      break
    }
  }

  onResize() {
    // this setState call forces a re-render of the component
    // to ensure that the drawer is responsive
    this.setState({})
  }

  onDrawerClose = () => {
    const { dispatch } = this.props
    dispatch(setShowLearningResourceDrawer({ objectId: null }))
  }

  render() {
    const { object, showLearningDrawer } = this.props
    return object ? (
      <Theme>
        <Drawer
          persistent={false}
          temporary={true}
          open={showLearningDrawer}
          onClose={this.onDrawerClose}
          dir="rtl"
          className="align-right"
        >
          <DrawerContent dir="ltr" className="alignRight">
            <div className="drawer-close" onClick={this.onDrawerClose}>
              <i className="material-icons clear">clear</i>
            </div>
            <ExpandedCourseDisplay course={object} />
            <div className="footer" />
          </DrawerContent>
        </Drawer>
      </Theme>
    ) : null
  }
}

export const getObject = (
  objectId: number,
  objectType: string,
  state: Object
) => {
  const { courses, bootcamps } = state
  switch (objectType) {
  case "course":
    return courses.data.get(objectId)
  case "bootcamp":
    return bootcamps.data.get(objectId)
  }
}

export const mapStateToProps = (state: Object) => {
  const { ui } = state

  const objectId = ui.courseDetail.objectId
  const objectType = ui.courseDetail.objectType
  const object = getObject(objectId, objectType, state)

  return {
    showLearningDrawer: _.isFinite(ui.courseDetail.objectId),
    objectId,
    objectType,
    object
  }
}

export default R.compose(
  connect(mapStateToProps),
  withRouter
)(LearningResourceDrawer)

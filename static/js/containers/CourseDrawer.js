// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { withRouter } from "react-router"
import { Drawer, DrawerContent } from "rmwc/Drawer"
import { Theme } from "rmwc/Theme"

import { setShowCourseDrawer } from "../actions/ui"
import { getViewportWidth } from "../lib/util"

import type { Dispatch } from "redux"
import type { Course } from "../flow/discussionTypes"
import ExpandedCourseDisplay from "../components/ExpandedCourseDisplay"
import { actions } from "../actions"

type Props = {
  showCourseDrawer: boolean,
  dispatch: Dispatch<*>,
  course: ?Course,
  courseId: number
}

const shouldLoadData = R.complement(
  R.allPass([
    // if course id's don't match
    R.eqProps("courseId"),
    // courses don't match
    R.eqProps("course")
  ])
)

export class CourseDrawer extends React.Component<Props> {
  width: number

  constructor(props: Props) {
    super(props)
    this.width = getViewportWidth()
  }

  componentDidMount() {
    const { courseId } = this.props
    window.addEventListener("resize", () => this.onResize())
    if (courseId) {
      this.loadData()
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { courseId } = this.props
    if (courseId && shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { dispatch, courseId } = this.props

    dispatch(actions.courses.get(courseId))
  }

  onResize() {
    // this setState call forces a re-render of the component
    // to ensure that the drawer is responsive
    this.setState({})
  }

  onDrawerClose = () => {
    const { dispatch } = this.props
    dispatch(setShowCourseDrawer({ visible: false, courseId: null }))
  }

  render() {
    const { course, showCourseDrawer } = this.props
    return course ? (
      <div>
        <Theme>
          <Drawer
            persistent={false}
            temporary={true}
            open={showCourseDrawer}
            onClose={this.onDrawerClose}
            dir="rtl"
            className="align-right"
          >
            <DrawerContent dir="ltr" className="alignRight">
              <div className="drawer-close" onClick={this.onDrawerClose}>
                <i className="material-icons clear">clear</i>
              </div>
              <ExpandedCourseDisplay course={course} />
              <div className="footer" />
            </DrawerContent>
          </Drawer>
        </Theme>
      </div>
    ) : null
  }
}

export const mapStateToProps = (state: Object) => {
  const { courses, ui } = state

  const courseId = ui.courseDetail.courseId
  const course = courses.data.get(courseId)

  return {
    showCourseDrawer: ui.courseDetail.visible,
    courseId,
    course
  }
}

export default R.compose(
  connect(mapStateToProps),
  withRouter
)(CourseDrawer)

// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"

import { CourseDrawer, mapStateToProps } from "./CourseDrawer"
import ExpandedCourseDisplay from "../components/ExpandedCourseDisplay"

import { setShowCourseDrawer } from "../actions/ui"
import { makeCourse } from "../factories/courses"
import { shouldIf } from "../lib/test_utils"

describe("CourseDrawer", () => {
  let sandbox, dispatchStub, course

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    dispatchStub = sandbox.stub()
    course = makeCourse()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderCourseDrawer = (props = {}) =>
    shallow(
      <CourseDrawer
        dispatch={dispatchStub}
        showCourseDrawer={true}
        course={course}
        courseId={course.id}
        {...props}
      />
    )

  it("should have an onDrawerClose function to hide the course drawer", async () => {
    const wrapper = renderCourseDrawer()
    await wrapper.instance().onDrawerClose()
    sinon.assert.calledWith(
      dispatchStub,
      setShowCourseDrawer({ courseId: null })
    )
  })

  it("should put an event listener on window resize", () => {
    const onResizeStub = sandbox.stub(CourseDrawer.prototype, "onResize")
    const addEventListenerStub = sandbox.stub(window, "addEventListener")
    renderCourseDrawer()
    assert.ok(addEventListenerStub.calledWith("resize"))
    addEventListenerStub.args[0][1]()
    assert.ok(onResizeStub.called)
  })

  it("should include an ExpandedCourseDisplay", () => {
    const wrapper = renderCourseDrawer()
    const expandedDisplay = wrapper.find(ExpandedCourseDisplay)
    assert.deepEqual(expandedDisplay.prop("course"), course)
  })

  it("should not include an ExpandedCourseDisplay if course is null", () => {
    const wrapper = renderCourseDrawer({ course: null })
    assert.isNotOk(wrapper.find(ExpandedCourseDisplay).exists())
  })

  //
  ;[
    [true, false, false, true],
    [false, false, true, true],
    [false, true, true, true],
    [true, false, true, false],
    [true, true, true, false]
  ].forEach(([sameId, nullId, sameCourse, needsLoad]) => {
    it(`${shouldIf(
      needsLoad
    )} load data on component update w/ same id ${String(
      sameId
    )}, null id ${String(nullId)}, same course ${String(sameCourse)}`, () => {
      const wrapper = renderCourseDrawer()
      const loadDataStub = sandbox.stub(wrapper.instance(), "loadData")
      wrapper.instance().componentDidUpdate({
        dispatch:         wrapper.props().dispatch,
        showCourseDrawer: true,
        courseId:         sameId ? course.id : nullId ? null : course.id + 1,
        course:           sameCourse ? course : null
      })
      sinon.assert.callCount(loadDataStub, needsLoad ? 1 : 0)
    })
  })

  //
  ;[[782, true], [null, false], [undefined, false], ["a7", false]].forEach(
    ([courseId, showDrawer]) => {
      it(`should grab state props and ${shouldIf(
        showDrawer
      )} show drawer if courseId is ${String(courseId)}`, () => {
        const state = {
          courses: {
            data: new Map([[[course.id], course]])
          },
          ui: {
            courseDetail: { courseId: courseId }
          }
        }
        const props = mapStateToProps(state)
        assert.equal(props.showCourseDrawer, showDrawer)
        assert.equal(props.courseId, state.ui.courseDetail.courseId)
        assert.deepEqual(props.course, state.courses[course.id])
      })
    }
  )
})

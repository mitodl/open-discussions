// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"

import {
  LearningResourceDrawer,
  mapStateToProps
} from "./LearningResourceDrawer"
import ExpandedCourseDisplay from "../components/ExpandedCourseDisplay"

import { setShowResourceDrawer } from "../actions/ui"
import { makeBootcamp, makeCourse } from "../factories/courses"
import { shouldIf } from "../lib/test_utils"
import ExpandedBootcampDisplay from "../components/ExpandedBootcampDisplay"

describe("LearningResourceDrawer", () => {
  let sandbox, dispatchStub, course

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    dispatchStub = sandbox.stub()
    course = makeCourse()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderLearningResourceDrawer = (props = {}) =>
    shallow(
      <LearningResourceDrawer
        dispatch={dispatchStub}
        showLearningDrawer={true}
        object={course}
        objectId={course.id}
        objectType="course"
        {...props}
      />
    )

  it("should have an onDrawerClose function to hide the course drawer", async () => {
    const wrapper = renderLearningResourceDrawer()
    await wrapper.instance().onDrawerClose()
    sinon.assert.calledWith(
      dispatchStub,
      setShowResourceDrawer({ objectId: null })
    )
  })

  it("should put an event listener on window resize", () => {
    const onResizeStub = sandbox.stub(
      LearningResourceDrawer.prototype,
      "onResize"
    )
    const addEventListenerStub = sandbox.stub(window, "addEventListener")
    renderLearningResourceDrawer()
    assert.ok(addEventListenerStub.calledWith("resize"))
    addEventListenerStub.args[0][1]()
    assert.ok(onResizeStub.called)
  })

  it("should include an ExpandedCourseDisplay", () => {
    const wrapper = renderLearningResourceDrawer()
    const expandedDisplay = wrapper.find(ExpandedCourseDisplay)
    assert.deepEqual(expandedDisplay.prop("course"), course)
  })

  it("should not include an ExpandedCourseDisplay if course is null", () => {
    const wrapper = renderLearningResourceDrawer({ object: null })
    assert.isNotOk(wrapper.find(ExpandedCourseDisplay).exists())
  })

  it("should include an ExpandedBootcampDisplay", () => {
    const bootcamp = makeBootcamp()
    const wrapper = renderLearningResourceDrawer({
      object:     bootcamp,
      objectId:   bootcamp.id,
      objectType: "bootcamp"
    })
    const expandedDisplay = wrapper.find(ExpandedBootcampDisplay)
    assert.deepEqual(expandedDisplay.prop("bootcamp"), bootcamp)
  })

  //
  ;[
    [10, 10, false, true],
    [10, 11, true, true],
    [10, null, true, true],
    [10, 10, true, false]
  ].forEach(([prevId, nextId, sameCourse, needsLoad]) => {
    it(`${shouldIf(
      needsLoad
    )} load data on component update w/ prev id ${String(
      prevId
    )}, next id ${String(nextId)}, same course ${String(sameCourse)}`, () => {
      course.id = prevId
      const wrapper = renderLearningResourceDrawer()
      const loadDataStub = sandbox.stub(wrapper.instance(), "loadData")
      wrapper.instance().componentDidUpdate({
        dispatch:           wrapper.props().dispatch,
        showLearningDrawer: true,
        objectId:           nextId,
        object:             sameCourse ? course : null,
        objectType:         "course"
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
            courseDetail: { objectId: courseId, objectType: "course" }
          }
        }
        const props = mapStateToProps(state)
        assert.equal(props.showLearningDrawer, showDrawer)
        assert.equal(props.objectId, state.ui.courseDetail.objectId)
        assert.deepEqual(props.object, state.courses[course.id])
      })
    }
  )
})

import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"

import {
  LearningResourceDrawer,
  mapStateToProps
} from "./LearningResourceDrawer"
import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"
import * as LRCardMod from "../components/LearningResourceCard"

import {
  makeBootcamp,
  makeCourse,
  makeProgram,
  makeVideo,
  makeUserList
} from "../factories/learning_resources"
import { makeYoutubeVideo } from "../factories/embedly"
import { shouldIf } from "../lib/test_utils"
import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_VIDEO,
  LR_TYPE_USERLIST
} from "../lib/constants"
import { courseRequest } from "../lib/queries/courses"
import { bootcampRequest } from "../lib/queries/bootcamps"
import { programRequest } from "../lib/queries/programs"
import { videoRequest } from "../lib/queries/videos"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("LearningResourceDrawer", () => {
  let dispatchStub,
    course,
    bootcamp,
    program,
    video,
    setShowResourceDrawerStub,
    helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    dispatchStub = helper.sandbox.stub()
    course = makeCourse()
    bootcamp = makeBootcamp()
    program = makeProgram()
    video = makeVideo()
    setShowResourceDrawerStub = helper.sandbox.stub()
    helper.stubComponent(
      LRCardMod,
      "LearningResourceRow",
      "LearningResourceRow"
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderLearningResourceDrawer = (props = {}) =>
    mount(
      <LearningResourceDrawer
        dispatch={dispatchStub}
        showLearningDrawer={true}
        object={course}
        objectId={course.id}
        runId={course.runs[0].run_id}
        objectType={LR_TYPE_COURSE}
        setShowResourceDrawer={setShowResourceDrawerStub}
        {...props}
      />
    )

  it("should have a button to hide the course drawer", async () => {
    const wrapper = renderLearningResourceDrawer()
    wrapper.find(".drawer-close").simulate("click")
    sinon.assert.calledWith(setShowResourceDrawerStub, { objectId: null })
  })

  it("should put an event listener on window resize", () => {
    const addEventListenerStub = helper.sandbox.stub(window, "addEventListener")
    renderLearningResourceDrawer()
    assert.ok(addEventListenerStub.called)
  })

  it("should include an ExpandedLearningResourceDisplay", () => {
    const wrapper = renderLearningResourceDrawer()
    const expandedDisplay = wrapper.find(ExpandedLearningResourceDisplay)
    assert.deepEqual(expandedDisplay.prop("object"), course)
  })

  it("should not include an ExpandedLearningResourceDisplay if object is null", () => {
    const wrapper = renderLearningResourceDrawer({ object: null })
    assert.isNotOk(wrapper.find(ExpandedLearningResourceDisplay).exists())
  })

  it("should include an ExpandedLearningResourceDisplay for a bootcamp", () => {
    const bootcamp = makeBootcamp()
    const wrapper = renderLearningResourceDrawer({
      object:     bootcamp,
      objectId:   bootcamp.id,
      objectType: LR_TYPE_BOOTCAMP
    })
    const expandedDisplay = wrapper.find(ExpandedLearningResourceDisplay)
    assert.deepEqual(expandedDisplay.prop("object"), bootcamp)
  })

  it("should include an ExpandedLearningResourceDisplay for a program", () => {
    const program = makeProgram()
    const wrapper = renderLearningResourceDrawer({
      object:     program,
      objectId:   program.id,
      objectType: LR_TYPE_PROGRAM
    })
    const expandedDisplay = wrapper.find(ExpandedLearningResourceDisplay)
    assert.deepEqual(expandedDisplay.prop("object"), program)
  })

  it("should include an ExpandedLearningResourceDisplay for a video", () => {
    const embedly = makeYoutubeVideo()
    const wrapper = renderLearningResourceDrawer({
      object:     video,
      objectId:   video.id,
      objectType: LR_TYPE_VIDEO,
      embedly
    })
    const expandedDisplay = wrapper.find(ExpandedLearningResourceDisplay)
    assert.deepEqual(expandedDisplay.prop("object"), video)
    assert.deepEqual(expandedDisplay.prop("embedly"), embedly)
  })

  it("should include an ExpandedLearningResourceDisplay for a userList", () => {
    const userList = makeUserList()
    const wrapper = renderLearningResourceDrawer({
      object:     userList,
      objectId:   userList.id,
      objectType: LR_TYPE_USERLIST
    })
    const expandedDisplay = wrapper.find(ExpandedLearningResourceDisplay)
    assert.deepEqual(expandedDisplay.prop("object"), userList)
  })

  describe("mapStateToProps", () => {
    let state

    beforeEach(() => {
      state = {
        entities: {
          courses: {
            [course.id]: course
          },
          bootcamps: {
            [bootcamp.id]: bootcamp
          },
          programs: {
            [program.id]: program
          },
          videos: {
            [video.id]: video
          }
        },
        queries: {
          [courseRequest(course.id).queryKey]: {
            isFinished: true
          },
          [bootcampRequest(bootcamp.id).queryKey]: {
            isFinished: true
          },
          [programRequest(program.id).queryKey]: {
            isFinished: true
          },
          [videoRequest(video.id).queryKey]: {
            isFinished: true
          }
        },
        ui: {
          courseDetail: { objectId: course.id, objectType: LR_TYPE_COURSE }
        }
      }
    })

    //
    ;[[782, true], [null, false], [undefined, false]].forEach(
      ([courseId, showDrawer]) => {
        it(`${shouldIf(showDrawer)} show drawer if courseId is ${String(
          courseId
        )}`, () => {
          state.ui.courseDetail.objectId = courseId
          const props = mapStateToProps(state)
          assert.equal(props.showLearningDrawer, showDrawer)
          assert.equal(props.objectId, state.ui.courseDetail.objectId)
        })
      }
    )

    //
    ;[LR_TYPE_BOOTCAMP, LR_TYPE_COURSE, LR_TYPE_PROGRAM, LR_TYPE_VIDEO].forEach(
      testObjectType => {
        it(`mapStateToProps should grab the right ${testObjectType}`, () => {
          state.ui.courseDetail.objectType = testObjectType
          let expectedObject
          switch (testObjectType) {
          case LR_TYPE_COURSE:
            expectedObject = course
            state.ui.courseDetail.objectId = course.id
            break
          case LR_TYPE_BOOTCAMP:
            expectedObject = bootcamp
            state.ui.courseDetail.objectId = bootcamp.id
            break
          case LR_TYPE_PROGRAM:
            expectedObject = program
            state.ui.courseDetail.objectId = program.id
            break
          case LR_TYPE_VIDEO:
            expectedObject = video
            state.ui.courseDetail.objectId = video.id
            break
          }
          const { object, objectType, objectId } = mapStateToProps(state)
          assert.deepEqual(object, expectedObject)
          assert.equal(objectType, testObjectType)
          assert.equal(objectId, expectedObject.id)
        })
      }
    )
  })
})

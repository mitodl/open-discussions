// @flow
import R from "ramda"
import { assert } from "chai"

import CourseCarousel from "./CourseCarousel"

import { makeCourse } from "../factories/learning_resources"
import { LR_TYPE_COURSE } from "../lib/constants"
import IntegrationTestHelper from "../util/integration_test_helper"
import * as LRCardModule from "./LearningResourceCard"

describe("CourseCarousel", () => {
  let courses, setShowResourceDrawerStub, helper, render

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    courses = R.times(makeCourse, 10)
    setShowResourceDrawerStub = helper.sandbox.stub()
    helper.stubComponent(LRCardModule, "LearningResourceCard")
    render = helper.configureHOCRenderer(
      CourseCarousel,
      CourseCarousel,
      {},
      {
        title:                 "Greatest Courses Ever",
        courses,
        setShowResourceDrawer: setShowResourceDrawerStub
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should display the provided title", async () => {
    const { wrapper } = await render()
    assert.equal(
      wrapper.find(".title-and-controls .title").text(),
      "Greatest Courses Ever"
    )
  })

  it("should render a card for each course in the carousel", async () => {
    const { wrapper } = await render()
    const carousel = wrapper.find("Carousel")
    R.zip(
      carousel.find("LearningResourceCard").map(R.identity),
      courses
    ).forEach(([el, course]) => {
      course.object_type = LR_TYPE_COURSE
      assert.deepEqual(el.prop("object"), course)
    })
  })
})

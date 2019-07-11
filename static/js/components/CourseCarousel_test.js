// @flow
import React from "react"
import R from "ramda"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import CourseCarousel from "./CourseCarousel"
import CourseCard from "./CourseCard"

import { makeCourse } from "../factories/courses"

describe("CourseCarousel", () => {
  let courses, sandbox, setShowCourseDrawerStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    courses = R.times(makeCourse, 10)
    setShowCourseDrawerStub = sandbox.stub()
  })

  const renderCarousel = (props = {}) =>
    shallow(
      <CourseCarousel
        title="Greatest Courses Ever"
        courses={courses}
        setShowLearningDrawer={setShowLearningDrawerStub}
        {...props}
      />
    )

  afterEach(() => {
    sandbox.restore()
  })

  it("should display the provided title", () => {
    const wrapper = renderCarousel()
    assert.equal(
      wrapper.find(".title-row .title").text(),
      "Greatest Courses Ever"
    )
  })

  it("should render a card for each course in the carousel", () => {
    const wrapper = renderCarousel()
    const carousel = wrapper.find("Carousel")
    R.zip(carousel.find(CourseCard).map(R.identity), courses).forEach(
      ([el, course]) => {
        assert.deepEqual(el.prop("course"), course)
      }
    )
  })
})

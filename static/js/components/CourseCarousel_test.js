// @flow
import React from "react"
import R from "ramda"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import CourseCarousel, { CarouselCourseCard } from "./CourseCarousel"

import { availabilityLabel, minPrice } from "../lib/courses"
import { configureShallowRenderer } from "../lib/test_utils"
import { makeCourse } from "../factories/courses"

describe("CourseCarousel", () => {
  let renderCarouselCard, courses, sandbox, setShowCourseDrawerStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    courses = R.times(makeCourse, 10)
    setShowCourseDrawerStub = sandbox.stub()
    renderCarouselCard = configureShallowRenderer(CarouselCourseCard, {
      course:              courses[0],
      setShowCourseDrawer: setShowCourseDrawerStub
    })
  })

  const renderCarousel = (props = {}) =>
    shallow(
      <CourseCarousel
        title="Greatest Courses Ever"
        courses={courses}
        setShowCourseDrawer={setShowCourseDrawerStub}
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
    R.zip(carousel.find(CarouselCourseCard).map(R.identity), courses).forEach(
      ([el, course]) => {
        assert.deepEqual(el.prop("course"), course)
      }
    )
  })

  it("Card should render title, availability, price, platform, topic", () => {
    const wrapper = renderCarouselCard()
    const [course] = courses
    assert.equal(wrapper.find(".topic").text(), course.topics[0].name)
    assert.equal(
      wrapper.find(".platform").text(),
      course.platform.toUpperCase()
    )
    assert.equal(wrapper.find("Dotdotdot").props().children, course.title)
    assert.equal(
      wrapper.find(".availability").text(),
      availabilityLabel(course.availability)
    )
    assert.equal(wrapper.find(".price").text(), minPrice(course))
  })

  it("Card should set an onClick handler with the provided function", () => {
    const wrapper = renderCarouselCard()
    wrapper.simulate("click")
    sinon.assert.called(setShowCourseDrawerStub)
  })
})

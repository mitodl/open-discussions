// @flow
import React from "react"
import R from "ramda"
import { assert } from "chai"
import sinon from "sinon"
import { mount } from "enzyme"

import CourseCarousel, { CarouselCourseCard } from "./CourseCarousel"

import { courseAvailability, minPrice } from "../lib/courses"
import { configureShallowRenderer, shouldIf } from "../lib/test_utils"
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
    mount(
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
      wrapper.find(".title-and-controls .title").text(),
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

  //
  ;[
    ["button.prev", true, true, "previous"],
    ["button.next", false, true, "next"],
    ["button.prev", false, false, "previous"],
    ["button.next", true, false, "next"]
  ].forEach(([selector, shouldDisable, atBeginning, name]) => {
    it(`${shouldIf(shouldDisable)} disable the ${name} button at the ${
      atBeginning ? "beginning" : "end"
    }`, () => {
      const wrapper = renderCarousel()
      if (!atBeginning) {
        R.times(() => wrapper.find("button.next").simulate("click"), 4)
      }
      const btn = wrapper.find(selector)
      const { disabled, className } = btn.props()
      assert.equal(disabled, shouldDisable)
      assert.equal(shouldDisable, className.includes("disabled"))
    })
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
      courseAvailability(course)
    )
    assert.equal(wrapper.find(".price").text(), minPrice(course))
  })

  it("Card should set an onClick handler with the provided function", () => {
    const wrapper = renderCarouselCard()
    wrapper.simulate("click")
    sinon.assert.called(setShowCourseDrawerStub)
  })
})

// @flow
/* global SETTINGS:false */
import React from "react"
import R from "ramda"
import { shallow } from "enzyme/build"
import { assert } from "chai"
import sinon from "sinon"

import CourseCard from "./CourseCard"

import { availabilityLabel, minPrice } from "../lib/courses"
import { shouldIf } from "../lib/test_utils"
import { makeBootcamp, makeCourse } from "../factories/resources"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  platformLogoUrls
} from "../lib/constants"
import { embedlyThumbnail } from "../lib/url"

describe("CourseCard", () => {
  let renderCourseCard, courses, course, sandbox, setShowResourceDrawerStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    courses = R.times(makeCourse, 10)
    setShowResourceDrawerStub = sandbox.stub()
    course = courses[0]
    renderCourseCard = ({ ...props }) =>
      shallow(
        <CourseCard
          object={course}
          objectType="course"
          setShowResourceDrawer={setShowResourceDrawerStub}
          {...props}
        />
      )
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should set an onClick handler with the setShowResourceDrawer function", () => {
    const wrapper = renderCourseCard()
    wrapper.find(".cover-image").simulate("click")
    wrapper.find(".course-title").simulate("click")
    sinon.assert.calledTwice(setShowResourceDrawerStub)
  })

  it("should set a click handler on the topics, if passed a function", () => {
    const setTopicStub = sandbox.stub()
    const wrapper = renderCourseCard({
      toggleFacet: setTopicStub
    })
    wrapper
      .find(".topic")
      .at(0)
      .simulate("click")
    sinon.assert.calledWith(setTopicStub, "topics", course.topics[0].name, true)
  })

  it("should render the image", () => {
    const coverImage = renderCourseCard()
      .find(".cover-image")
      .find("img")
    assert.equal(
      coverImage.prop("src"),
      embedlyThumbnail(
        SETTINGS.embedlyKey,
        course.image_src,
        CAROUSEL_IMG_HEIGHT,
        CAROUSEL_IMG_WIDTH
      )
    )
    assert.equal(coverImage.prop("alt"), `cover image for ${course.title}`)
  })

  it("should render the title", () => {
    assert.equal(
      renderCourseCard()
        .find("Dotdotdot")
        .props().children,
      course.title
    )
  })

  it("should render the topic", () => {
    assert.equal(
      renderCourseCard()
        .find(".topics")
        .find(".topic")
        .at(0)
        .text(),
      course.topics[0].name
    )
  })
  //
  ;[true, false].forEach(isCourse => {
    it(`${shouldIf(isCourse)} render the platform`, () => {
      const object = isCourse ? makeCourse() : makeBootcamp()
      const wrapper = renderCourseCard({
        object:     object,
        objectType: isCourse ? "course" : "bootcamp"
      })
      assert.equal(wrapper.find(".platform").exists(), isCourse)
      if (isCourse) {
        const platformImg = wrapper.find(".platform").find("img")
        // $FlowFixMe: only courses will end up here
        assert.equal(platformImg.prop("src"), platformLogoUrls[object.platform])
        // $FlowFixMe: only courses will end up here
        assert.equal(platformImg.prop("alt"), `logo for ${object.platform}`)
      }
    })
  })

  it("should render availability", () => {
    assert.equal(
      renderCourseCard()
        .find(".availability")
        .text(),
      availabilityLabel(course.availability)
    )
  })

  it("should render price", () => {
    assert.equal(
      renderCourseCard()
        .find(".price")
        .text(),
      minPrice(course)
    )
  })
})

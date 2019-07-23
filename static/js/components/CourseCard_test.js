// @flow
/* global SETTINGS:false */
import R from "ramda"
import { assert } from "chai"
import sinon from "sinon"

import CourseCard from "./CourseCard"

import { availabilityLabel, minPrice } from "../lib/courses"
import { configureShallowRenderer } from "../lib/test_utils"
import { makeCourse } from "../factories/courses"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  platformLogoUrls
} from "../lib/constants"
import { embedlyThumbnail } from "../lib/url"

describe("CourseCard", () => {
  let renderCarouselCard, courses, course, sandbox, setShowLearningDrawerStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    courses = R.times(makeCourse, 10)
    setShowLearningDrawerStub = sandbox.stub()
    course = courses[0]
    renderCarouselCard = configureShallowRenderer(CourseCard, {
      course,
      setShowLearningDrawer: setShowLearningDrawerStub
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should set an onClick handler with the setShowCourseDrawer function", () => {
    const wrapper = renderCarouselCard()
    wrapper.find(".cover-image").simulate("click")
    wrapper.find(".course-title").simulate("click")
    sinon.assert.calledTwice(setShowLearningDrawerStub)
  })

  it("should set a click handler on the topics, if passed a function", () => {
    const setTopicStub = sandbox.stub()
    const wrapper = renderCarouselCard({
      toggleFacet: setTopicStub
    })
    wrapper
      .find(".topic")
      .at(0)
      .simulate("click")
    sinon.assert.calledWith(setTopicStub, "topics", course.topics[0].name, true)
  })

  it("should render the image", () => {
    const coverImage = renderCarouselCard()
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
      renderCarouselCard()
        .find("Dotdotdot")
        .props().children,
      course.title
    )
  })

  it("should render the topic", () => {
    assert.equal(
      renderCarouselCard()
        .find(".topics")
        .find(".topic")
        .at(0)
        .text(),
      course.topics[0].name
    )
  })

  it("should render the platform", () => {
    const platformImg = renderCarouselCard()
      .find(".platform")
      .find("img")
    assert.equal(platformImg.prop("src"), platformLogoUrls[course.platform])
    assert.equal(platformImg.prop("alt"), `logo for ${course.platform}`)
  })

  it("should render availability", () => {
    assert.equal(
      renderCarouselCard()
        .find(".availability")
        .text(),
      availabilityLabel(course.availability)
    )
  })

  it("should render price", () => {
    assert.equal(
      renderCarouselCard()
        .find(".price")
        .text(),
      minPrice(course)
    )
  })
})

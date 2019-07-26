// @flow
/* global SETTINGS:false */
import R from "ramda"
import { assert } from "chai"
import sinon from "sinon"

import LearningResourceCard from "./LearningResourceCard"

import { availabilityLabel, minPrice } from "../lib/learning_resources"
import { makeBootcamp, makeCourse } from "../factories/learning_resources"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  platformLogoUrls,
  platforms
} from "../lib/constants"
import { embedlyThumbnail } from "../lib/url"
import { configureShallowRenderer } from "../lib/test_utils"

describe("LearningResourceCard", () => {
  let render, courses, course, sandbox, setShowResourceDrawerStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    courses = R.times(makeCourse, 10)
    setShowResourceDrawerStub = sandbox.stub()
    course = courses[0]
    render = configureShallowRenderer(LearningResourceCard, {
      object:                course,
      setShowResourceDrawer: setShowResourceDrawerStub
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should set an onClick handler with the setShowResourceDrawer function", () => {
    const wrapper = render()
    wrapper.find(".cover-image").simulate("click")
    wrapper.find(".course-title").simulate("click")
    sinon.assert.calledTwice(setShowResourceDrawerStub)
  })

  it("should set a click handler on the topics, if passed a function", () => {
    const setTopicStub = sandbox.stub()
    const wrapper = render({
      toggleFacet: setTopicStub
    })
    wrapper
      .find(".topic")
      .at(0)
      .simulate("click")
    sinon.assert.calledWith(setTopicStub, "topics", course.topics[0].name, true)
  })

  it("should render the image", () => {
    const coverImage = render()
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
      render()
        .find("Dotdotdot")
        .props().children,
      course.title
    )
  })

  it("should render the topic", () => {
    assert.equal(
      render()
        .find(".topics")
        .find(".topic")
        .at(0)
        .text(),
      course.topics[0].name
    )
  })
  //
  ;[true, false].forEach(isCourse => {
    it(`should render the platform image`, () => {
      const object = isCourse
        ? R.merge({ object_type: "course" }, makeCourse())
        : R.merge({ object_type: "bootcamp" }, makeBootcamp())
      const platformImg = render({
        object: object
      })
        .find(".platform")
        .find("img")
      assert.equal(
        platformImg.prop("src"),
        // $FlowFixMe: only courses will access platform
        platformLogoUrls[isCourse ? object.platform : platforms.bootcamps]
      )
      assert.equal(
        platformImg.prop("alt"),
        // $FlowFixMe: only courses will access platform
        `logo for ${isCourse ? object.platform : platforms.bootcamps}`
      )
    })
  })

  it("should render availability", () => {
    assert.equal(
      render()
        .find(".availability")
        .text(),
      availabilityLabel(course.availability)
    )
  })

  it("should render price", () => {
    assert.equal(
      render()
        .find(".price")
        .text(),
      minPrice(course)
    )
  })
})

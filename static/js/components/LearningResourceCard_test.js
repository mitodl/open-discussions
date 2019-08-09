/* global SETTINGS:false */
import R from "ramda"
import { assert } from "chai"
import sinon from "sinon"

import { LearningResourceCard } from "./LearningResourceCard"

import { availabilityLabel, minPrice } from "../lib/learning_resources"
import {
  makeCourse,
  makeLearningResource
} from "../factories/learning_resources"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  platformLogoUrls,
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP
} from "../lib/constants"
import {
  embedlyThumbnail,
  starSelectedURL,
  starUnselectedURL
} from "../lib/url"
import { configureShallowRenderer } from "../lib/test_utils"

describe("LearningResourceCard", () => {
  let render,
    courses,
    course,
    sandbox,
    setShowResourceDrawerStub,
    toggleFavoriteStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    courses = R.times(makeCourse, 10)
    setShowResourceDrawerStub = sandbox.stub()
    toggleFavoriteStub = sandbox.stub()
    course = courses[0]
    render = configureShallowRenderer(LearningResourceCard, {
      object:                course,
      setShowResourceDrawer: setShowResourceDrawerStub,
      toggleFavorite:        toggleFavoriteStub
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
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].forEach(objectType => {
    it(`should render the platform image`, () => {
      const object = makeLearningResource(objectType)
      const isCourse = objectType === LR_TYPE_COURSE
      const platformImg = render({
        object
      })
        .find(".platform-favorite")
        .find("img.course-platform")
      assert.equal(
        platformImg.prop("src"),
        // $FlowFixMe: only courses will access platform
        platformLogoUrls[
          isCourse
            ? object.offered_by || object.platform || ""
            : object.offered_by
        ]
      )
      assert.equal(
        platformImg.prop("alt"),
        // $FlowFixMe: only courses will access platform
        `logo for ${
          isCourse
            ? object.offered_by || object.platform || ""
            : object.offered_by
        }`
      )
    })
  })

  //
  ;[true, false].forEach(isFavorite => {
    [LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].forEach(objectType => {
      it(`should render ${
        isFavorite ? "filled-in" : "empty"
      } star when ${objectType} is ${
        isFavorite ? "a" : "not a"
      } favorite`, () => {
        const object = makeLearningResource(objectType)
        object.is_favorite = isFavorite
        const src = render({
          object
        })
          .find(".platform-favorite")
          .find("img.favorite")
          .prop("src")
        assert.equal(src, isFavorite ? starSelectedURL : starUnselectedURL)
      })
    })
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].forEach(objectType => {
    it(`should call the toggleFavorite with a ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({ object })
      wrapper.find(".favorite").simulate("click")
      sinon.assert.calledWith(toggleFavoriteStub, object)
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

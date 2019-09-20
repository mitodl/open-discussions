/* global SETTINGS:false */
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { mount } from "enzyme"

import { LearningResourceCard } from "./LearningResourceCard"

import { bestRun, bestRunLabel, minPrice } from "../lib/learning_resources"
import { makeLearningResource } from "../factories/learning_resources"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_ALL,
  COURSE_AVAILABLE_NOW
} from "../lib/constants"
import {
  embedlyThumbnail,
  starSelectedURL,
  starUnselectedURL
} from "../lib/url"

describe("LearningResourceCard", () => {
  let course, sandbox, setShowResourceDrawerStub, toggleFavoriteStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    setShowResourceDrawerStub = sandbox.stub()
    toggleFavoriteStub = sandbox.stub()
    course = makeLearningResource(LR_TYPE_COURSE)
  })

  const render = (props = {}) =>
    mount(
      <LearningResourceCard
        object={course}
        setShowResourceDrawer={setShowResourceDrawerStub}
        toggleFavorite={toggleFavoriteStub}
        {...props}
      />
    )

  afterEach(() => {
    sandbox.restore()
  })

  it("should set an onClick handler with the setShowResourceDrawer function", () => {
    const wrapper = render()
    wrapper.find(".cover-image").simulate("click")
    wrapper.find(".course-title").simulate("click")
    sinon.assert.calledTwice(setShowResourceDrawerStub)
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
    const { content, label } = render()
      .find("Subtitle")
      .at(1)
      .props()
    course.topics.forEach(({ name }) => {
      assert.include(content, name)
    })
    assert.equal(label, "Subject - ")
  })

  //
  ;["OCW", "MITx", "foo"].forEach(offeredBy => {
    it(`should render offered_by`, () => {
      const object = makeLearningResource(LR_TYPE_COURSE)
      object.offered_by = offeredBy
      const offeredBySubtitle = render({
        object
      })
        .find("Subtitle")
        .at(0)

      assert.equal(offeredBySubtitle.prop("content"), object.offered_by)
      assert.equal(offeredBySubtitle.prop("label"), "Offered by - ")
    })
  })

  //
  ;["", null].forEach(offeredBy => {
    it(`should not render offered_by subtitle if null`, () => {
      const object = makeLearningResource(LR_TYPE_COURSE)
      object.offered_by = offeredBy
      const offeredBySubtitle = render({
        object
      })
        .find("Subtitle")
        .at(0)
      assert.notEqual(offeredBySubtitle.prop("label"), "Offered by - ")
    })
  })

  //
  ;[true, false].forEach(isFavorite => {
    LR_TYPE_ALL.forEach(objectType => {
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
          .find("img.favorite")
          .prop("src")
        assert.equal(src, isFavorite ? starSelectedURL : starUnselectedURL)
      })
    })
  })

  LR_TYPE_ALL.forEach(objectType => {
    it(`should call the toggleFavorite with a ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({ object })
      wrapper.find(".favorite img").simulate("click")
      sinon.assert.calledWith(toggleFavoriteStub, object)
    })
  })

  LR_TYPE_ALL.forEach(objectType => {
    it(`should render availability for a ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      assert.equal(
        render({ object })
          .find(".availability")
          .text()
          .replace("calendar_today", ""),
        [LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].includes(objectType)
          ? bestRunLabel(bestRun(object.course_runs))
          : COURSE_AVAILABLE_NOW
      )
    })
  })

  it("should render price", () => {
    assert.include(
      render()
        .find(".price")
        .text(),
      minPrice(course)
    )
  })
})

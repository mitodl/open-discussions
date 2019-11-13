/* global SETTINGS:false */
import { assert } from "chai"
import R from "ramda"

import {
  LearningResourceCard,
  LearningResourceRow
} from "./LearningResourceCard"
import Card from "./Card"

import IntegrationTestHelper from "../util/integration_test_helper"

import { bestRun, bestRunLabel, minPrice } from "../lib/learning_resources"
import {
  makeCourse,
  makeLearningResource,
  makeUserList
} from "../factories/learning_resources"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_ALL,
  COURSE_AVAILABLE_NOW,
  offeredBys
} from "../lib/constants"
import {
  embedlyThumbnail,
  starSelectedURL,
  starUnselectedURL,
  toQueryString,
  COURSE_SEARCH_URL,
  userListApiURL
} from "../lib/url"
import { DIALOG_ADD_TO_LIST } from "../actions/ui"
import { queryListResponse } from "../lib/test_utils"

describe("LearningResourceCard", () => {
  let course, userList, helper, render, renderRow

  beforeEach(() => {
    course = makeLearningResource(LR_TYPE_COURSE)
    userList = makeUserList()
    helper = new IntegrationTestHelper()
    helper.handleRequestStub
      .withArgs(userListApiURL)
      .returns(queryListResponse([userList]))
    render = helper.configureReduxQueryRenderer(LearningResourceCard, {
      object: course
    })
    renderRow = helper.configureReduxQueryRenderer(LearningResourceRow, {
      object: course
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should set an onClick handler with the setShowResourceDrawer function", async () => {
    const { wrapper, store } = await render()
    wrapper.find(".cover-image").simulate("click")
    wrapper.find(".course-title").simulate("click")
    const { objectId, objectType } = store.getState().ui.courseDetail
    assert.equal(objectId, course.id)
    assert.equal(objectType, LR_TYPE_COURSE)
  })

  it("should render the image", async () => {
    const { wrapper } = await render()
    const coverImage = wrapper.find(".cover-image").find("img")
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

  it("should render the title", async () => {
    const { wrapper } = await render()
    assert.equal(wrapper.find("Dotdotdot").props().children, course.title)
  })

  it("should render topics as links", async () => {
    const { wrapper } = await render()
    const subtitle = wrapper.find("Subtitle").at(1)
    const links = subtitle.find("a")
    course.topics.forEach(({ name }, i) => {
      const link = links.at(i)
      assert.equal(link.text(), name)
      assert.equal(
        link.prop("href"),
        `${COURSE_SEARCH_URL}${toQueryString({
          t: name
        })}`
      )
    })
    assert.equal(subtitle.prop("label"), "Subjects - ")
  })

  it("should render a single topic", async () => {
    course.topics = [course.topics[0]]
    const { wrapper } = await render()
    const { label } = wrapper
      .find("Subtitle")
      .at(1)
      .props()
    assert.equal(label, "Subject - ")
  })

  it("should not render topics if they aren't present", async () => {
    course.topics = []
    const { wrapper } = await render()
    assert.notOk(
      wrapper
        .find("Subtitle")
        .at(1)
        .exists()
    )
  })

  //
  R.values(offeredBys).forEach(offeredBy => {
    it(`should render offered_by`, async () => {
      const object = makeLearningResource(LR_TYPE_COURSE)
      object.offered_by = [offeredBy]
      const { wrapper } = await render({ object })
      const offeredBySubtitle = wrapper.find("Subtitle").at(0)
      assert.equal(offeredBySubtitle.prop("label"), "Offered by - ")
      const link = offeredBySubtitle.find("a")
      assert.equal(link.text(), object.offered_by)
      assert.equal(
        link.prop("href"),
        `${COURSE_SEARCH_URL}${toQueryString({
          o: object.offered_by
        })}`
      )
    })
  })

  //
  it(`should not render offered_by subtitle if empty`, async () => {
    const object = makeLearningResource(LR_TYPE_COURSE)
    object.offered_by = []
    const { wrapper } = await render({ object })
    const offeredBySubtitle = wrapper.find("Subtitle").at(0)
    assert.notEqual(offeredBySubtitle.prop("label"), "Offered by - ")
  })

  //
  ;[true, false].forEach(isFavorite => {
    LR_TYPE_ALL.forEach(objectType => {
      it(`should render ${
        isFavorite ? "filled-in" : "empty"
      } star when ${objectType} is ${
        isFavorite ? "a" : "not a"
      } favorite`, async () => {
        const object = makeLearningResource(objectType)
        object.is_favorite = isFavorite
        const { wrapper } = await render({ object })
        const src = wrapper.find("img.favorite").prop("src")
        assert.equal(src, isFavorite ? starSelectedURL : starUnselectedURL)
      })
    })
  })

  //
  ;[true, false].forEach(inList => {
    it(`should render ${inList ? "filled-in" : "empty"} star when course is ${
      inList ? "" : "not"
    } in the user's lists`, async () => {
      const object = makeCourse()
      object.is_favorite = false
      object.lists = inList ? [userList.items[0].id] : []
      const { wrapper } = await render({ object })
      const src = wrapper.find("img.favorite").prop("src")
      assert.equal(src, inList ? starSelectedURL : starUnselectedURL)
    })
  })

  LR_TYPE_ALL.forEach(objectType => {
    it(`should call showListDialog with a ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper, store } = await render({ object })
      wrapper.find(".favorite img").simulate("click")
      assert.deepEqual(
        store.getState().ui.dialogs.get(DIALOG_ADD_TO_LIST),
        object
      )
    })
  })

  LR_TYPE_ALL.forEach(objectType => {
    it(`should render availability for a ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render({ object })
      assert.equal(
        wrapper
          .find(".availability")
          .text()
          .replace("calendar_today", ""),
        [LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].includes(objectType)
          ? bestRunLabel(bestRun(object.runs))
          : COURSE_AVAILABLE_NOW
      )
    })
  })

  it("should render price", async () => {
    const { wrapper } = await render()
    assert.include(
      wrapper.find(".price").text(),
      minPrice(bestRun(course.runs).prices)
    )
  })

  it("should render a LearningResourceRow", async () => {
    const { wrapper } = await renderRow()
    assert.ok(wrapper.find("LearningResourceDisplay").exists())
    assert.deepEqual(
      wrapper.find("LearningResourceDisplay").prop("object"),
      course
    )
    assert.isNotOk(wrapper.find(Card).exists())
  })
})

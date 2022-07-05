/* global SETTINGS:false */
import { assert } from "chai"
import moment from "moment"

import {
  LearningResourceCard,
  LearningResourceRow
} from "./LearningResourceCard"
import Card from "./Card"

import IntegrationTestHelper from "../util/integration_test_helper"

import { bestRun } from "../lib/learning_resources"
import {
  makeCourse,
  makeLearningResource,
  makeUserList
} from "../factories/learning_resources"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  LR_TYPE_ALL,
  LR_TYPE_COURSE,
  OPEN_CONTENT,
  PROFESSIONAL,
  CERTIFICATE,
  DISPLAY_DATE_FORMAT
} from "../lib/constants"
import {
  COURSE_SEARCH_URL,
  userListApiURL,
  embedlyThumbnail,
  toQueryString
} from "../lib/url"
import { DIALOG_ADD_TO_LIST } from "../actions/ui"
import { queryListResponse } from "../lib/test_utils"

const iconMap = {
  [OPEN_CONTENT]: "/static/images/open_content_icon.png",
  [PROFESSIONAL]: "/static/images/professional_icon.png",
  [CERTIFICATE]:  "/static/images/certificate_icon.png"
}

describe("LearningResourceCard", () => {
  let course, userList, helper, render, renderRow

  beforeEach(() => {
    course = makeLearningResource(LR_TYPE_COURSE)
    userList = makeUserList()
    helper = new IntegrationTestHelper()
    helper.handleRequestStub
      .withArgs(userListApiURL.toString())
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
    const { objectId, objectType } = store.getState().ui.LRDrawerHistory[0]
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
  it("should render offered_bys as links", async () => {
    const { wrapper } = await render()
    const subtitle = wrapper.find("Subtitle").at(0)
    const links = subtitle.find("a")
    course.offered_by.forEach((name, i) => {
      const link = links.at(i)
      assert.equal(link.text(), name)
      assert.equal(
        link.prop("href"),
        `${COURSE_SEARCH_URL}${toQueryString({
          o: name
        })}`
      )
    })
    assert.equal(subtitle.prop("label"), "Offered by - ")
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
      } bookmark icon when ${objectType} is ${
        isFavorite ? "a" : "not a"
      } favorite`, async () => {
        const object = makeLearningResource(objectType)
        object.is_favorite = isFavorite
        const { wrapper } = await render({ object })
        assert.include(
          wrapper.find(".favorite i").prop("className"),
          isFavorite ? "bookmark" : "bookmark_border"
        )
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
      object.lists = inList ? [{ item_id: 1, list_id: 2 }] : []
      const { wrapper } = await render({ object })
      assert.include(
        wrapper.find(".favorite i").prop("className"),
        inList ? "bookmark" : "bookmark_border"
      )
    })
  })

  LR_TYPE_ALL.forEach(objectType => {
    it(`should call showListDialog with a ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper, store } = await render({ object })
      wrapper.find(".favorite").simulate("click")
      assert.deepEqual(
        store.getState().ui.dialogs.get(DIALOG_ADD_TO_LIST),
        object
      )
    })
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

  //
  ;[true, false].forEach(reordering => {
    it(`should set a classname and show UI when reordering=${String(
      reordering
    )}`, async () => {
      const { wrapper } = await render({ reordering })
      assert.equal(
        wrapper.find(Card).prop("className"),
        reordering
          ? "learning-resource-card  reordering"
          : "learning-resource-card"
      )
      assert.equal(wrapper.find(".drag-handle").exists(), reordering)
      assert.equal(wrapper.find("Subtitle").exists(), !reordering)
      assert.equal(wrapper.find(".start-date-favorite").exists(), !reordering)
      assert.equal(wrapper.find(".cover-image").exists(), !reordering)
    })
  })

  it(`should render a start date if there is a certificate`, async () => {
    const object = makeLearningResource(LR_TYPE_COURSE)
    object.certification = [CERTIFICATE]
    const { wrapper } = await render({ object })
    const startDate = wrapper
      .find(".start-date")
      .text()
      .replace("calendar_today", "")
    assert.equal(
      startDate,
      moment(bestRun(object.runs).best_start_date).format(DISPLAY_DATE_FORMAT)
    )
  })

  it(`should not render a certificate icon or start date if there is no certificate`, async () => {
    const object = makeLearningResource(LR_TYPE_COURSE)
    object.certification = []
    const { wrapper } = await render({ object })
    assert.isNotOk(
      wrapper
        .find(".audience-certificates")
        .find("img")
        .exists()
    )
    assert.isNotOk(wrapper.find(".start-date").exists())
  })

  //
  ;[[], [CERTIFICATE]].forEach(certification => {
    [[], [OPEN_CONTENT], [PROFESSIONAL], [OPEN_CONTENT, PROFESSIONAL]].forEach(
      audience => {
        it(`should render the corret icons for certificate=[${certification}] and audience=[${audience}]`, async () => {
          const object = makeLearningResource(LR_TYPE_COURSE)
          object.audience = audience
          object.certification = certification
          const { wrapper } = await render({ object })

          const expectedIcons = audience
            .concat(certification)
            .map(attribute => iconMap[attribute])
          const displayedIcons = wrapper
            .find(".audience-certificates")
            .find("img")
            .map(image => image.prop("src"))

          assert.deepEqual(expectedIcons, displayedIcons)
        })
      }
    )
  })
})

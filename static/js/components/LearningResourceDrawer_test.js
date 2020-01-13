import { assert } from "chai"

import LearningResourceDrawer from "./LearningResourceDrawer"
import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"
import * as LRCardMod from "../components/LearningResourceCard"

import {
  makeBootcamp,
  makeCourse,
  makeProgram,
  makeVideo,
  makeUserList,
  makeLearningResource
} from "../factories/learning_resources"
import { makeYoutubeVideo } from "../factories/embedly"
import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_LEARNINGPATH
} from "../lib/constants"
import IntegrationTestHelper from "../util/integration_test_helper"
import { pushLRHistory } from "../actions/ui"

import {
  courseDetailApiURL,
  bootcampDetailApiURL,
  programDetailApiURL,
  userListDetailApiURL,
  videoDetailApiURL,
  embedlyApiURL,
  similarResourcesURL
} from "../lib/url"
import { mockHTMLElHeight } from "../lib/test_utils"
import { makeSearchResult } from "../factories/search"

describe("LearningResourceDrawer", () => {
  let course, helper, render, similarItems

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    course = makeCourse()
    similarItems = [
      makeSearchResult(LR_TYPE_COURSE),
      makeSearchResult(LR_TYPE_BOOTCAMP),
      makeSearchResult(LR_TYPE_COURSE)
    ]
    helper.stubComponent(
      LRCardMod,
      "LearningResourceRow",
      "LearningResourceRow"
    )
    helper.handleRequestStub.withArgs(similarResourcesURL).returns({
      status: 200,
      body:   similarItems
    })
    render = helper.configureReduxQueryRenderer(LearningResourceDrawer)
    mockHTMLElHeight(100, 50)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const mockObjectAPI = (object, apiUrl) =>
    helper.handleRequestStub.withArgs(`${apiUrl}/${object.id}/`).returns({
      status: 200,
      body:   object
    })

  const renderWithObject = async (object, apiUrl) => {
    helper.handleRequestStub.withArgs(apiUrl).returns({
      status: 200,
      body:   object
    })

    const { wrapper, store } = await render({}, [
      pushLRHistory({
        objectId:   object.id,
        objectType: object.object_type
      })
    ])
    return { wrapper, store }
  }

  it("should have a button to hide the course drawer", async () => {
    const { wrapper, store } = await renderWithObject(
      course,
      courseDetailApiURL
    )
    wrapper.find(".drawer-close").simulate("click")
    // this means that the history has been cleared
    assert.deepEqual(store.getState().ui.LRDrawerHistory, [])
  })

  it("should have a back button if there is more than one object in the drawer history", async () => {
    const course = makeCourse()
    const bootcamp = makeBootcamp()
    mockObjectAPI(
      course,
      courseDetailApiURL.param({ courseId: course.id }).toString()
    )
    mockObjectAPI(
      bootcamp,
      bootcampDetailApiURL.param({ bootcampId: bootcamp.id }).toString()
    )
    const { wrapper, store } = await render({}, [
      pushLRHistory({
        objectId:   course.id,
        objectType: course.object_type
      }),
      pushLRHistory({
        objectId:   bootcamp.id,
        objectType: bootcamp.object_type
      })
    ])
    wrapper.find(".back").simulate("click")
    assert.deepEqual(store.getState().ui.LRDrawerHistory, [
      {
        objectId:   course.id,
        objectType: LR_TYPE_COURSE,
        runId:      undefined
      }
    ])
  })

  it("should put an event listener on window resize", async () => {
    const addEventListenerStub = helper.sandbox.stub(window, "addEventListener")
    await render()
    assert.ok(addEventListenerStub.called)
  })

  it("should not include an ExpandedLearningResourceDisplay if there isn't a focused object", async () => {
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find(ExpandedLearningResourceDisplay).exists())
  })

  it("should pass a callback to add to the history stack to ExpandedLearningResourceDisplay", async () => {
    const learningPath = makeLearningResource(LR_TYPE_LEARNINGPATH)
    mockObjectAPI(
      learningPath,
      userListDetailApiURL.param({ userListId: learningPath.id }).toString()
    )
    const { wrapper, store } = await renderWithObject(
      course,
      courseDetailApiURL.param({ courseId: course.id }).toString()
    )
    wrapper.find(ExpandedLearningResourceDisplay).prop("setShowResourceDrawer")(
      {
        objectId:   "test-id",
        objectType: LR_TYPE_LEARNINGPATH
      }
    )
    assert.deepEqual(store.getState().ui.LRDrawerHistory, [
      {
        objectId:   course.id,
        objectType: LR_TYPE_COURSE,
        runId:      undefined
      },
      {
        objectId:   "test-id",
        objectType: LR_TYPE_LEARNINGPATH,
        runId:      undefined
      }
    ])
  })

  //
  ;[
    [makeBootcamp(), bootcampDetailApiURL, "bootcampId"],
    [makeProgram(), programDetailApiURL, "programId"],
    [makeCourse(), courseDetailApiURL, "courseId"],
    [makeUserList(), userListDetailApiURL, "userListId"]
  ].forEach(([object, apiUrl, key]) => {
    it(`should render ExpandedLearningResourceDisplay with object of type ${
      object.object_type
    }`, async () => {
      const url = apiUrl.param({ [key]: object.id }).toString()
      const { wrapper } = await renderWithObject(object, url)
      const expandedDisplay = wrapper.find(ExpandedLearningResourceDisplay)
      assert.deepEqual(expandedDisplay.prop("object"), object)
    })
  })

  it("should include an ExpandedLearningResourceDisplay for a video", async () => {
    const video = makeVideo()
    const embedly = makeYoutubeVideo()
    helper.handleRequestStub
      .withArgs(
        `${embedlyApiURL}/${encodeURIComponent(encodeURIComponent(video.url))}/`
      )
      .returns({
        status: 200,
        body:   embedly
      })
    const { wrapper } = await renderWithObject(
      video,
      videoDetailApiURL.param({ videoId: video.id }).toString()
    )
    const expandedDisplay = wrapper.find(ExpandedLearningResourceDisplay)
    assert.deepEqual(expandedDisplay.prop("object"), video)
    assert.deepEqual(expandedDisplay.prop("embedly"), embedly)
    assert.deepEqual(expandedDisplay.prop("similarItems"), similarItems)
  })
})

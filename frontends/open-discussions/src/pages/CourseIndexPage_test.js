// @flow
import { assert } from "chai"
import R from "ramda"
import sinon from "sinon"
import * as Searchbox from "../components/search/Searchbox"

import CourseIndexPage from "./CourseIndexPage"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer
} from "../components/PageBanner"
import CourseCarousel from "../components/CourseCarousel"

import {
  COURSE_BANNER_URL,
  favoritesURL,
  featuredCoursesURL,
  upcomingCoursesURL,
  newCoursesURL,
  userListApiURL,
  newVideosURL,
  popularContentUrl
} from "../lib/url"
import { queryListResponse } from "../lib/test_utils"
import {
  makeCourse,
  makeFavoritesResponse,
  makeVideo,
  makePopularContentResponse
} from "../factories/learning_resources"
import IntegrationTestHelper from "../util/integration_test_helper"
import * as lrHooks from "../hooks/learning_resources"

describe("CourseIndexPage", () => {
  let featuredCourses,
    upcomingCourses,
    newCourses,
    newVideos,
    render,
    helper,
    courseLists,
    favorites,
    popularContent,
    hookStub

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    featuredCourses = R.times(makeCourse, 10).map(course => {
      course.is_favorite = false
      return course
    })

    favorites = makeFavoritesResponse()
    upcomingCourses = R.times(makeCourse, 10).map(course => {
      course.is_favorite = false
      return course
    })
    newCourses = R.times(makeCourse, 10).map(course => {
      course.is_favorite = false
      return course
    })
    newVideos = R.times(makeVideo, 10).map(video => {
      video.is_favorite = false
      return video
    })
    popularContent = makePopularContentResponse().map(resource => {
      resource.is_favorite = false
      return resource
    })

    courseLists = {
      featuredCourses,
      upcomingCourses,
      newCourses,
      newVideos,
      popularContent,
      // eslint-disable-next-line camelcase
      favorites: favorites.map(({ content_data, content_type }) => ({
        ...content_data, // eslint-disable-line camelcase
        object_type: content_type
      }))
    }
    helper.handleRequestStub
      .withArgs(favoritesURL)
      .returns(queryListResponse(favorites))
    helper.handleRequestStub
      .withArgs(featuredCoursesURL)
      .returns(queryListResponse(featuredCourses))
    helper.handleRequestStub
      .withArgs(upcomingCoursesURL)
      .returns(queryListResponse(upcomingCourses))
    helper.handleRequestStub
      .withArgs(newCoursesURL)
      .returns(queryListResponse(newCourses))
    helper.handleRequestStub
      .withArgs(newVideosURL)
      .returns(queryListResponse(newVideos))
    helper.handleRequestStub
      .withArgs(popularContentUrl)
      .returns(queryListResponse(popularContent))
    helper.handleRequestStub
      .withArgs(userListApiURL.toString())
      .returns(queryListResponse([]))
    render = helper.configureReduxQueryRenderer(CourseIndexPage)

    helper.stubComponent(Searchbox, "Searchbox", "default")

    hookStub = helper.sandbox.stub(lrHooks, "useLearningResourcePermalink")
  })

  afterEach(() => {
    helper.cleanup()
  })

  //
  ;[
    ["favorites", "Your Favorites"],
    ["featuredCourses", "Featured Courses"],
    ["newCourses", "New Courses"],
    ["popularContent", "Popular Learning Resources"],
    ["upcomingCourses", "Upcoming Courses"],
    ["newVideos", "New Videos"]
  ].forEach(([courseListName, title], idx) => {
    it(`should pass ${title} down to carousel`, async () => {
      const courseList = courseLists[courseListName]
      const { wrapper } = await render()
      const carousel = wrapper.find(CourseCarousel).at(idx)
      assert.equal(title, carousel.prop("title"))
      // $FlowFixMe: libdef out of date
      assert.includeMembers(
        carousel.prop("courses").map(obj => obj.course_id),
        courseList.map(obj => obj.course_id)
      )
    })
  })

  it("shouldnt render a featured carousel if featuredCourses is empty", async () => {
    helper.handleRequestStub
      .withArgs(featuredCoursesURL)
      .returns(queryListResponse([]))
    const { wrapper } = await render()
    const carousels = wrapper.find("CourseCarousel")
    assert.lengthOf(carousels, 5)
    assert.deepEqual(
      carousels.map(el => el.prop("title")),
      [
        "Your Favorites",
        "New Courses",
        "Popular Learning Resources",
        "Upcoming Courses",
        "New Videos"
      ]
    )
  })

  it("should hide the favorites carousel when empty", async () => {
    helper.handleRequestStub
      .withArgs(favoritesURL)
      .returns(queryListResponse([]))
    const { wrapper } = await render()
    const carousels = wrapper.find("CourseCarousel")
    assert.lengthOf(carousels, 5)
    assert.deepEqual(
      carousels.map(el => el.prop("title")),
      [
        "Featured Courses",
        "New Courses",
        "Popular Learning Resources",
        "Upcoming Courses",
        "New Videos"
      ]
    )
  })

  it("should hide the popular resources carousel when empty", async () => {
    helper.handleRequestStub
      .withArgs(popularContentUrl)
      .returns(queryListResponse([]))
    const { wrapper } = await render()
    const carousels = wrapper.find("CourseCarousel")
    assert.lengthOf(carousels, 5)
    assert.deepEqual(
      carousels.map(el => el.prop("title")),
      [
        "Your Favorites",
        "Featured Courses",
        "New Courses",
        "Upcoming Courses",
        "New Videos"
      ]
    )
  })

  it("should include a banner image", async () => {
    const { wrapper } = await render()
    ;[BannerPageWrapper, BannerPageHeader, BannerContainer].forEach(
      component => {
        assert.ok(wrapper.find(component).exists())
      }
    )
    const { src } = wrapper.find("BannerImage").props()
    assert.equal(src, COURSE_BANNER_URL)
  })

  it("should have a search textbox which redirects you", async () => {
    const { wrapper } = await render()
    wrapper.find("Searchbox").prop("onChange")({
      target: { value: "search term" }
    })
    wrapper.update()
    wrapper.find("Searchbox").prop("onSubmit")()
    const { pathname, search } = helper.currentLocation
    assert.equal(pathname, "/learn/search")
    assert.equal(search, "?q=search%20term")
  })

  //
  ;[
    newVideosURL,
    newCoursesURL,
    popularContentUrl,
    featuredCoursesURL,
    favoritesURL
  ].forEach(url => {
    it(`should have a loading state for ${url}`, async () => {
      helper.handleRequestStub.withArgs(favoritesURL).returns({})
      const { wrapper } = await render()
      assert.equal(wrapper.find("CarouselLoading").length, 1)
    })
  })

  it("should call hook for drawer sharing", async () => {
    await render()
    sinon.assert.called(hookStub)
  })
})

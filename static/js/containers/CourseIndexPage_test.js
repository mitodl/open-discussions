// @flow
import { assert } from "chai"
import R from "ramda"
import sinon from "sinon"

import LearningResourceDrawer from "./LearningResourceDrawer"
import { CourseIndexPage } from "./CourseIndexPage"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer
} from "../components/PageBanner"

import { COURSE_BANNER_URL } from "../lib/url"
import { configureShallowRenderer } from "../lib/test_utils"
import { makeCourse } from "../factories/learning_resources"

describe("CourseIndexPage", () => {
  let featuredCourses,
    upcomingCourses,
    newCourses,
    setShowResourceDrawerStub,
    renderCourseIndexPage,
    sandbox,
    courseLists

  beforeEach(() => {
    featuredCourses = R.times(makeCourse, 10)
    upcomingCourses = R.times(makeCourse, 10)
    newCourses = R.times(makeCourse, 10)
    courseLists = {
      featuredCourses,
      upcomingCourses,
      newCourses
    }
    sandbox = sinon.createSandbox()
    setShowResourceDrawerStub = sandbox.stub()
    renderCourseIndexPage = configureShallowRenderer(CourseIndexPage, {
      setShowResourceDrawer: setShowResourceDrawerStub,
      loaded:                true,
      ...courseLists
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  //
  ;[
    ["featuredCourses", "Featured Courses"],
    ["upcomingCourses", "Upcoming Courses"],
    ["newCourses", "New Courses"]
  ].forEach(([courseListName, title], idx) => {
    it(`should pass ${title} down to carousel`, () => {
      const courseList = courseLists[courseListName]
      const carousel = renderCourseIndexPage()
        .find("CourseCarousel")
        .at(idx)
      assert.equal(title, carousel.prop("title"))
      assert.deepEqual(courseList, carousel.prop("courses"))
      carousel.prop("setShowResourceDrawer")()
      sinon.assert.called(setShowResourceDrawerStub)
    })
  })

  it("should render a LearningResourceDrawer", () => {
    const wrapper = renderCourseIndexPage()
    assert.ok(wrapper.find(LearningResourceDrawer).exists())
  })

  it("shouldnt render carousels if loaded === false", () => {
    const wrapper = renderCourseIndexPage({ loaded: false })
    assert.isNotOk(wrapper.find("CourseCarousel").exists())
  })

  it("shouldnt render a featured carousel if featuredCourses is empty", () => {
    const carousels = renderCourseIndexPage({ featuredCourses: [] }).find(
      "CourseCarousel"
    )
    assert.lengthOf(carousels, 2)
    assert.deepEqual(carousels.map(el => el.prop("title")), [
      "Upcoming Courses",
      "New Courses"
    ])
  })

  it("should include a banner image", () => {
    const wrapper = renderCourseIndexPage()
    ;[BannerPageWrapper, BannerPageHeader, BannerContainer].forEach(
      component => {
        assert.ok(wrapper.find(component).exists())
      }
    )
    const { src } = wrapper.find("BannerImage").props()
    assert.equal(src, COURSE_BANNER_URL)
  })

  it("should have a search textbox which redirects you", () => {
    const pushStub = sandbox.stub()
    const wrapper = renderCourseIndexPage({
      history: {
        push: pushStub
      }
    })
    const searchBox = wrapper.find("CourseSearchbox")
    searchBox.simulate("submit", { target: { value: "search term" } })
    sinon.assert.calledWith(pushStub, "/courses/search?q=search%20term")
  })
})

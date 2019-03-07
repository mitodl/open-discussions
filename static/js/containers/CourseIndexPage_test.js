// @flow
import { assert } from "chai"
import R from "ramda"
import sinon from "sinon"

import CourseDrawer from "./CourseDrawer"
import { CourseIndexPage } from "./CourseIndexPage"

import { configureShallowRenderer } from "../lib/test_utils"
import { makeCourse } from "../factories/courses"

describe("CourseIndexPage", () => {
  let featuredCourses,
    upcomingCourses,
    newCourses,
    setShowCourseDrawerStub,
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
    setShowCourseDrawerStub = sandbox.stub()
    renderCourseIndexPage = configureShallowRenderer(CourseIndexPage, {
      setShowCourseDrawer: setShowCourseDrawerStub,
      loaded:              true,
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
      carousel.prop("setShowCourseDrawer")()
      sinon.assert.called(setShowCourseDrawerStub)
    })
  })

  it("should render a CourseDrawer", () => {
    const wrapper = renderCourseIndexPage()
    assert.ok(wrapper.find(CourseDrawer).exists())
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
})

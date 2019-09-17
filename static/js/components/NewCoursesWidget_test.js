// @flow

import R from "ramda"
import { assert } from "chai"

import NewCoursesWidget from "./NewCoursesWidget"

import { mockCourseAPIMethods } from "../lib/test_utils"
import { makeCourse } from "../factories/learning_resources"
import { availabilityLabel } from "../lib/learning_resources"
import { COURSE_URL } from "../lib/url"
import IntegrationTestHelper from "../util/integration_test_helper"
import { flatZip } from "../lib/util"

describe("NewCoursesWidget", () => {
  let render, newCourses, upcomingCourses, helper, courses

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(NewCoursesWidget)
    newCourses = R.times(makeCourse, 5)
    upcomingCourses = R.times(makeCourse, 5)
    courses = flatZip(newCourses, upcomingCourses)
    mockCourseAPIMethods(helper, upcomingCourses, newCourses)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render information for all courses returns", async () => {
    const { wrapper } = await render()
    R.zip(wrapper.find(".course").map(R.identity), courses).forEach(
      ([el, course]) => {
        assert.equal(el.find("Dotdotdot").prop("children"), course.title)
        const availabilityAndPlatform = el
          .find(".availability-and-platform")
          .text()
        assert.include(
          availabilityAndPlatform,
          availabilityLabel(course.course_runs[0].availability)
        )
        assert.include(availabilityAndPlatform, course.platform.toUpperCase())
      }
    )
  })

  it("shouldnt display anything if no courses are returned", async () => {
    mockCourseAPIMethods(helper, [], [])
    const { wrapper } = await render()
    assert.isFalse(wrapper.find(".course").exists())
  })

  it("should have a 'react more' link", async () => {
    const { wrapper } = await render()
    const link = wrapper.find("Link")
    assert.equal(link.props().to, COURSE_URL)
    assert.equal(link.props().children, "View More")
  })
})

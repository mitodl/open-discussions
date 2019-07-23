// @flow

import R from "ramda"
import { assert } from "chai"

import { NewCoursesWidget } from "./NewCoursesWidget"

import { configureShallowRenderer } from "../lib/test_utils"
import { makeCourse } from "../factories/resources"
import { availabilityLabel } from "../lib/courses"
import { COURSE_URL } from "../lib/url"

describe("NewCoursesWidget", () => {
  let renderNewCourseWidget, courses

  beforeEach(() => {
    courses = R.times(makeCourse, 10)
    renderNewCourseWidget = configureShallowRenderer(NewCoursesWidget, {
      courses,
      loaded: true
    })
  })

  it("should render information for all courses returns", () => {
    const wrapper = renderNewCourseWidget()
    R.zip(wrapper.find(".course").map(R.identity), courses).forEach(
      ([el, course]) => {
        assert.equal(el.find("Dotdotdot").prop("children"), course.title)
        const availabilityAndPlatform = el
          .find(".availability-and-platform")
          .text()
        assert.include(
          availabilityAndPlatform,
          availabilityLabel(course.availability)
        )
        assert.include(availabilityAndPlatform, course.platform.toUpperCase())
      }
    )
  })

  it("shouldnt display anything if loaded === false", () => {
    const wrapper = renderNewCourseWidget({ loaded: false })
    assert.ok(wrapper.equals(null))
  })

  it("should have a 'react more' link", () => {
    const link = renderNewCourseWidget().find("Link")
    assert.equal(link.props().to, COURSE_URL)
    assert.equal(link.props().children, "View More")
  })
})

import sinon from "sinon"
import { assert } from "chai"
import R from "ramda"

import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import {
  getCourse,
  featuredCoursesSelector,
  featuredCoursesRequest,
  upcomingCoursesSelector,
  upcomingCoursesRequest,
  newCoursesSelector,
  newCoursesRequest,
  nextUpdate,
  courseArrayUpdate
} from "./courses"
import { makeCourse } from "../../factories/courses"

describe("Channels API", () => {
  let fetchJSONStub, sandbox, transformTestObject

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
    transformTestObject = {
      results: R.times(makeCourse, 10),
      next:    "http://a.url"
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("gets course", async () => {
    const course = makeCourse()
    fetchJSONStub.returns(Promise.resolve(course))

    const result = await getCourse(course.id)
    assert.ok(fetchJSONStub.calledWith(`/api/v0/courses/${course.id}/`))
    assert.deepEqual(result, course)
  })

  it("nextUpdate", () => {
    assert.equal(nextUpdate("prev", "next"), "next")
  })

  it("courseArrayUpdate", () => {
    const prevCourses = R.times(makeCourse, 10)
    const newCourses = R.times(makeCourse, 10)
    assert.deepEqual(courseArrayUpdate(prevCourses, newCourses), newCourses)
  })

  describe("featuredCourses", () => {
    it("should have a selector", () => {
      assert.deepEqual(
        [{ course: "hey" }],
        featuredCoursesSelector({
          entities: {
            featuredCourses: [{ course: "hey" }]
          }
        })
      )
    })

    it("should have a request object", () => {
      const { url, transform, update } = featuredCoursesRequest()
      assert.equal(url, "/api/v0/courses/featured")
      const { featuredCourses, featuredCoursesNext } = transform(
        transformTestObject
      )
      assert.deepEqual(featuredCourses, transformTestObject.results)
      assert.equal(featuredCoursesNext, transformTestObject.next)
      assert.equal(update.featuredCourses, courseArrayUpdate)
      assert.equal(update.featuredCoursesNext, nextUpdate)
    })
  })

  describe("upcomingCourses", () => {
    it("should have a selector", () => {
      assert.deepEqual(
        [{ course: "hey" }],
        upcomingCoursesSelector({
          entities: {
            upcomingCourses: [{ course: "hey" }]
          }
        })
      )
    })

    it("should have a request object", () => {
      const { url, transform, update } = upcomingCoursesRequest()
      assert.equal(url, "/api/v0/courses/upcoming")
      const { upcomingCourses, upcomingCoursesNext } = transform(
        transformTestObject
      )
      assert.deepEqual(upcomingCourses, transformTestObject.results)
      assert.equal(upcomingCoursesNext, transformTestObject.next)
      assert.equal(update.upcomingCourses, courseArrayUpdate)
      assert.equal(update.upcomingCoursesNext, nextUpdate)
    })
  })

  describe("newCourses", () => {
    it("should have a selector", () => {
      assert.deepEqual(
        [{ course: "hey" }],
        newCoursesSelector({
          entities: {
            newCourses: [{ course: "hey" }]
          }
        })
      )
    })

    it("should have a request object", () => {
      const { url, transform, update } = newCoursesRequest()
      assert.equal(url, "/api/v0/courses/new")
      const { newCourses, newCoursesNext } = transform(transformTestObject)
      assert.deepEqual(newCourses, transformTestObject.results)
      assert.equal(newCoursesNext, transformTestObject.next)
      assert.equal(update.newCourses, courseArrayUpdate)
      assert.equal(update.newCoursesNext, nextUpdate)
    })
  })
})

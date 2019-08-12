import sinon from "sinon"
import { assert } from "chai"
import R from "ramda"

import {
  courseListRequestFactory,
  courseRequest,
  favoriteCourseMutation
} from "./courses"
import { makeCourse } from "../../factories/learning_resources"
import { courseURL } from "../url"
import { constructIdMap } from "../redux_query"

describe("Courses API", () => {
  let sandbox, transformTestObject, results

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    results = R.times(makeCourse, 10)
    results.sort()
    transformTestObject = {
      results,
      next: "http://a.url"
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("courseRequest allows fetching a course", () => {
    const request = courseRequest("fake-id")
    assert.equal(request.url, `${courseURL}/fake-id/`)
    assert.deepEqual(request.transform({ id: "foobar" }), {
      courses: {
        foobar: { id: "foobar" }
      }
    })
  })

  //
  ;[true, false].forEach(isFavorite => {
    it(`courseFavoriteMutation does the right stuff if ${
      isFavorite ? "is" : "is not"
    } favorite`, () => {
      const course = makeCourse()
      course.is_favorite = isFavorite
      const mutation = favoriteCourseMutation(course)
      assert.equal(
        mutation.url,
        `${courseURL}/${course.id}/${isFavorite ? "unfavorite" : "favorite"}/`
      )
      assert.deepEqual(mutation.body, course)
      assert.deepEqual(mutation.transform(), {
        courses: {
          [course.id]: {
            ...course,
            is_favorite: !isFavorite
          }
        }
      })
    })
  })

  describe("courseListRequestFactory", () => {
    let request, selector

    beforeEach(() => {
      [request, selector] = courseListRequestFactory(
        "/my/api/url",
        "bestCourses"
      )
    })

    it("request should have url", () => {
      assert.equal(request().url, "/my/api/url")
    })

    it("request.transform should return the right structure", () => {
      assert.deepEqual(request().transform(transformTestObject), {
        courses:         constructIdMap(results),
        bestCourses:     results.map(course => course.id),
        bestCoursesNext: transformTestObject.next
      })
    })

    it("selector should grab the right stuff", () => {
      const testState = request().transform(transformTestObject)
      assert.deepEqual(selector({ entities: testState }), results)
    })
  })
})

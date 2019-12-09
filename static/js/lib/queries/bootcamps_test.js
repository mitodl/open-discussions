import { assert } from "chai"

import { bootcampRequest, favoriteBootcampMutation } from "./bootcamps"
import { makeBootcamp } from "../../factories/learning_resources"
import { bootcampDetailApiURL } from "../url"

describe("Bootcamps API", () => {
  let bootcamp

  beforeEach(() => {
    bootcamp = makeBootcamp()
  })

  it("bootcamp request allows fetching a bootcamp", () => {
    const request = bootcampRequest("fake-id")
    assert.equal(
      request.url,
      bootcampDetailApiURL.param({ bootcampId: "fake-id" }).toString()
    )
    assert.deepEqual(request.transform({ id: "foobar" }), {
      bootcamps: {
        foobar: { id: "foobar" }
      }
    })
  })

  //
  ;[true, false].forEach(isFavorite => {
    it(`bootcampFavoriteMutation does the right stuff if ${
      isFavorite ? "is" : "is not"
    } favorite`, () => {
      bootcamp.is_favorite = isFavorite
      const mutation = favoriteBootcampMutation(bootcamp)
      assert.equal(
        mutation.url,
        `${bootcampDetailApiURL.param({ bootcampId: bootcamp.id }).toString()}${
          isFavorite ? "unfavorite" : "favorite"
        }/`
      )
      assert.deepEqual(mutation.transform(), {
        bootcamps: {
          [bootcamp.id]: {
            ...bootcamp,
            is_favorite: !isFavorite
          }
        }
      })
    })
  })
})

import { assert } from "chai"

import { bootcampRequest, favoriteBootcampMutation } from "./bootcamps"
import { makeBootcamp } from "../../factories/learning_resources"
import { bootcampURL } from "../url"

describe("Bootcamps API", () => {
  let bootcamp

  beforeEach(() => {
    bootcamp = makeBootcamp()
  })

  it("bootcamp request allows fetching a bootcamp", () => {
    const request = bootcampRequest("fake-id")
    assert.equal(request.url, `${bootcampURL}/fake-id/`)
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
        `${bootcampURL}/${bootcamp.id}/${
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

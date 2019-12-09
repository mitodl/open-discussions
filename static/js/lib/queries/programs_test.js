import { assert } from "chai"

import { programRequest, favoriteProgramMutation } from "./programs"
import { makeProgram } from "../../factories/learning_resources"
import { programDetailApiURL } from "../url"

describe("Programs API", () => {
  let program

  beforeEach(() => {
    program = makeProgram()
  })

  it("program request allows fetching a program", () => {
    const request = programRequest("fake-id")
    assert.equal(
      request.url,
      programDetailApiURL.param({ programId: "fake-id" }).toString()
    )
    assert.deepEqual(request.transform({ id: "foobar" }), {
      programs: {
        foobar: { id: "foobar" }
      }
    })
  })

  //
  ;[true, false].forEach(isFavorite => {
    it(`programFavoriteMutation does the right stuff if ${
      isFavorite ? "is" : "is not"
    } favorite`, () => {
      program.is_favorite = isFavorite
      const mutation = favoriteProgramMutation(program)
      assert.equal(
        mutation.url,
        `${programDetailApiURL.param({ programId: program.id }).toString()}${
          isFavorite ? "unfavorite" : "favorite"
        }/`
      )
      assert.deepEqual(mutation.transform(), {
        programs: {
          [program.id]: {
            ...program,
            is_favorite: !isFavorite
          }
        }
      })
    })
  })
})

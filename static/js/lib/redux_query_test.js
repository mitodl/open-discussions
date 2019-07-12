import { assert } from "chai"

import { constructIdMap } from "./redux_query"

describe("Redux Query helpers", () => {
  it("constructIdMap should return a map from a list", () => {
    const results = [
      { id: 1, content: "foo" },
      { id: 2, content: "bar" },
      { id: 3, content: "baz" }
    ]

    assert.deepEqual(constructIdMap(results), {
      1: results[0],
      2: results[1],
      3: results[2]
    })
  })
})

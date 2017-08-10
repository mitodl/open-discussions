// @flow
import { assert } from "chai"

import {
  wait,
  enumerate,
} from "./util"

describe("utility functions", () => {
  it("waits some milliseconds", done => {
    let executed = false
    wait(30).then(() => {
      executed = true
    })

    setTimeout(() => {
      assert.isFalse(executed)

      setTimeout(() => {
        assert.isTrue(executed)

        done()
      }, 20)
    }, 20)
  })

  it("enumerates an iterable", () => {
    const someNums = function*() {
      yield* [6,7,8,9,10]
    }

    let list = []
    for (const item of enumerate(someNums())) {
      list.push(item)
    }

    assert.deepEqual(list, [
      [0, 6],
      [1, 7],
      [2, 8],
      [3, 9],
      [4, 10],
    ])
  })
})

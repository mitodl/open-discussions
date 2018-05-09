// @flow
/* global SETTINGS:false */
import sinon from "sinon"
import { assert } from "chai"

import {
  wait,
  enumerate,
  isEmptyText,
  preventDefaultAndInvoke,
  userIsAnonymous
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
      yield* [6, 7, 8, 9, 10]
    }

    const list = []
    for (const item of enumerate(someNums())) {
      list.push(item)
    }

    assert.deepEqual(list, [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10]])
  })

  it("isEmptyText works as expected", () => {
    [
      [" ", true],
      ["", true],
      ["\n\t   ", true],
      ["                   \t ", true],
      ["foo \n", false],
      ["foo", false],
      ["   \n\tfoo", false]
    ].forEach(([text, exp]) => {
      assert.equal(isEmptyText(text), exp)
    })
  })

  it("preventDefaultAndInvoke works as expected", () => {
    const invokee = sinon.stub()
    const event = {
      preventDefault: sinon.stub()
    }

    preventDefaultAndInvoke(invokee, event)

    sinon.assert.calledWith(invokee)
    sinon.assert.calledWith(event.preventDefault)
  })

  it("should check if SETTINGS.username is nil", () => {
    [[null, true], ["username", false]].forEach(([username, expectation]) => {
      SETTINGS.username = username
      assert.equal(userIsAnonymous(), expectation)
    })
  })
})

// @flow
/* global SETTINGS:false */
import sinon from "sinon"
import { assert } from "chai"

import {
  wait,
  enumerate,
  isEmptyText,
  preventDefaultAndInvoke,
  userIsAnonymous,
  isProfileComplete,
  notNil,
  truncate,
  getTokenFromUrl,
  defaultProfileImageUrl
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

  it("truncate works as expected", () => {
    [
      ["", ""],
      [null, ""],
      ["A random string", "A random string"],
      ["A random string with many words.", "A random string..."]
    ].forEach(([text, expected]) => {
      assert.equal(truncate(text, 20), expected)
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

  it("isProfileComplete returns false if any required fields are missing", () => {
    [[null, "bio"], [null, "headline"], [null, "image"]].forEach(
      ([bio, headline, image]) => {
        const profile = {
          name:                 "Test User",
          username:             "AHJS123123FHG",
          image:                image,
          image_small:          image,
          image_medium:         image,
          image_file:           image,
          image_small_file:     image,
          image_medium_file:    image,
          profile_image_small:  defaultProfileImageUrl,
          profile_image_medium: defaultProfileImageUrl,
          bio:                  bio,
          headline:             headline
        }
        assert.equal(
          isProfileComplete(profile),
          bio !== null && headline !== null && image !== null
        )
      }
    )
  })

  it("notNil works as expected", () => {
    [
      [null, false],
      [undefined, false],
      [0, true],
      ["", true],
      ["abc", true]
    ].forEach(([val, exp]) => {
      assert.equal(notNil(val), exp)
    })
  })

  it("getTokenFromUrl gets a token value from a url match or the querystring", () => {
    [
      ["url_token", undefined, "url_token"],
      [undefined, "?token=querystring_token", "querystring_token"],
      ["url_token", "?token=querystring_token", "url_token"],
      [undefined, "?not_token=whatever", ""],
      [undefined, undefined, ""]
    ].forEach(([urlMatchTokenValue, querystringValue, exp]) => {
      const props = {
        match: {
          params: {
            token: urlMatchTokenValue
          }
        },
        location: {
          search: querystringValue
        }
      }
      const token = getTokenFromUrl(props)
      assert.equal(token, exp)
    })
  })
})

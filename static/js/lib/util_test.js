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
  defaultProfileImageUrl,
  makeUUID,
  spaceSeparated,
  isValidUrl,
  flatZip,
  formatPrice,
  normalizeDoubleQuotes
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
    const someNums = function* () {
      yield* [6, 7, 8, 9, 10]
    }

    const list = []
    for (const item of enumerate(someNums())) {
      list.push(item)
    }

    assert.deepEqual(list, [
      [0, 6],
      [1, 7],
      [2, 8],
      [3, 9],
      [4, 10]
    ])
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
    [
      [null, true],
      ["username", false]
    ].forEach(([username, expectation]) => {
      SETTINGS.username = username
      assert.equal(userIsAnonymous(), expectation)
    })
  })

  it("isProfileComplete returns false if any required fields are missing", () => {
    [
      [null, "bio"],
      [null, "headline"],
      [null, "image"]
    ].forEach(([bio, headline, image]) => {
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
    })
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

  describe("makeUUID", () => {
    it("should return a string", () => {
      const uuid = makeUUID(10)
      assert.isString(uuid)
    })

    it("should be as long as you specify", () => {
      [10, 11, 12, 20, 3].forEach(len => {
        assert.equal(makeUUID(len).length, len)
      })
    })

    it("it uhh shouldnt return the same thing twice :D", () => {
      assert.notEqual(makeUUID(10), makeUUID(10))
    })
  })

  describe("spaceSeparated", () => {
    it("should return a space separated string when given an array of strings or nulls", () => {
      [
        [["a", "b", "c"], "a b c"],
        [[null, null], ""],
        [[null, "a", "b"], "a b"],
        [["a", "b", null], "a b"]
      ].forEach(([inputArr, expectedStr]) => {
        assert.deepEqual(spaceSeparated(inputArr), expectedStr)
      })
    })
  })

  describe("isValidUrl", () => {
    it("should assert that a URL allows underscores and requires a protocol prefix", () => {
      assert.isFalse(isValidUrl("mit.edu"))
      assert.isFalse(isValidUrl(""))
      assert.isTrue(isValidUrl("http://mit.edu/a_url_here"))
    })

    it("should be null safe", () => {
      // $FlowFixMe
      assert.isFalse(isValidUrl(null))
      // $FlowFixMe
      assert.isFalse(isValidUrl(undefined))
    })
  })

  it("flattens and zips", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6], flatZip([1, 3, 5], [2, 4, 6]))
  })

  describe("formatPrice", () => {
    it("format price", () => {
      assert.equal(formatPrice(20), "$20")
      assert.equal(formatPrice(20.005), "$20.01")
      assert.equal(formatPrice(20.1), "$20.10")
      assert.equal(formatPrice(20.6059), "$20.61")
      assert.equal(formatPrice(20.6959), "$20.70")
      assert.equal(formatPrice(20.1234567), "$20.12")
    })

    it("returns an empty string if null or undefined", () => {
      assert.equal(formatPrice(null), "")
      assert.equal(formatPrice(undefined), "")
    })
  })

  describe("normalizeDoubleQuotes", () => {
    it("returns a string with any fancy double quotes removed", () => {
      [
        ['"text phrase"', '"text phrase"'],
        ["\u201Ctext phrase\u201D", '"text phrase"'],
        ["some text", "some text"],
        ["text", "text"],
        [null, ""],
        [undefined, ""]
      ].forEach(([inputStr, expectedStr]) => {
        assert.equal(normalizeDoubleQuotes(inputStr), expectedStr)
      })
    })
  })
})

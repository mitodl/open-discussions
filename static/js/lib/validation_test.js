// @flow
import { assert } from "chai"
import R from "ramda"

import { LINK_TYPE_TEXT, LINK_TYPE_LINK } from "./channels"
import { assertIsNothing, assertIsJustNoVal } from "./test_utils"
import {
  validation,
  validate,
  validatePostCreateForm,
  validateChannelAppearanceEditForm,
  validateChannelBasicEditForm,
  validateContentReportForm
} from "./validation"

describe("validation library", () => {
  describe("validation", () => {
    it("returns a Just if the validation passes", () => {
      const result = validation(
        R.equals("potato"),
        R.lensPath(["foo", "bar", "baz"]),
        "SHUD BE POTATO YUP!",
        { foo: { bar: { baz: "potato" } } }
      )
      assertIsJustNoVal(result)
    })

    it("the returned setter puts the validation message in the right place", () => {
      const result = validation(
        R.equals("potato"),
        R.lensPath(["foo", "bar", "baz"]),
        "SHUD BE POTATO YUP!",
        { foo: { bar: { baz: "potato" } } }
      )
      assert.deepEqual(result.value({}), {
        foo: { bar: { baz: "SHUD BE POTATO YUP!" } }
      })
    })

    it("returns Nothing if the validation doesnt pass", () => {
      assertIsNothing(
        validation(
          R.equals("not equal"),
          R.lensPath(["wait", "up"]),
          "These should be not equal",
          { wait: { up: "equal!" } }
        )
      )
    })
  })

  describe("validate", () => {
    let validations
    beforeEach(() => {
      validations = [
        validation(
          R.equals("beep"),
          R.lensProp("topLevel"),
          "top-level validation failed"
        ),
        validation(
          R.isEmpty,
          R.lensPath(["nested", "prop"]),
          "simple nested validation failed"
        ),
        validation(
          R.equals("blippy boop doop"),
          R.lensPath(["nested", "array", 2]),
          "nested array validation failed"
        )
      ]
    })

    it("should take an array of validations and return Just if they apply", () => {
      const curriedValidate = validate([
        validation(R.equals("hey"), R.lensProp("topLevel"), "validation failed")
      ])
      assert.deepEqual(curriedValidate({ topLevel: "hey" }), {
        topLevel: "validation failed"
      })
    })

    it("should return Nothing if they dont apply", () => {
      const perfectObject = { nested: { prop: "should be defined" } }
      assert.deepEqual(validate(validations, perfectObject), {})
    })

    it("should support checking for a variety of errors", () => {
      const failingObject = {
        nested: { array: ["just", "stuff", "blippy boop doop"] }
      }
      assert.deepEqual(validate(validations, failingObject), {
        nested: {
          array: [undefined, undefined, "nested array validation failed"]
        }
      })
    })
  })

  describe("validatePostCreateForm", () => {
    it("should complain about no title", () => {
      const post = { value: { postType: LINK_TYPE_TEXT, text: "foobar" } }
      assert.deepEqual(validatePostCreateForm(post), {
        value: {
          title: "Title is required"
        }
      })
    })

    it("should complain about no text on a text post", () => {
      const post = { value: { postType: LINK_TYPE_TEXT, title: "potato" } }
      assert.deepEqual(validatePostCreateForm(post), {
        value: {
          text: "Post text cannot be empty"
        }
      })
    })

    it("should complain about no url on a url post", () => {
      const post = { value: { postType: LINK_TYPE_LINK, title: "potato" } }
      assert.deepEqual(validatePostCreateForm(post), {
        value: {
          url: "Post url cannot be empty"
        }
      })
    })

    it("should complain about missing post type", () => {
      const post = { value: { postType: null, title: "potato" } }
      assert.deepEqual(validatePostCreateForm(post), {
        value: {
          post_type: "One of text or post tabs must be selected"
        }
      })
    })

    it("should complain about too long of a title", () => {
      const post = {
        value: {
          postType: LINK_TYPE_TEXT,
          title:    "a".repeat(301),
          text:     "a great post! really"
        }
      }
      assert.deepEqual(validatePostCreateForm(post), {
        value: {
          title: "Title length is limited to 300 characters"
        }
      })
      post.value.title = "a".repeat(300)
      assert.deepEqual(validatePostCreateForm(post), {})
    })
  })

  describe("validateChannelAppearanceEditForm", () => {
    it("should complain about too long of a description", () => {
      const channel = {
        value: {
          description: "a".repeat(5121)
        }
      }
      assert.deepEqual(validateChannelAppearanceEditForm(channel), {
        value: {
          description: "Description length is limited to 5120 characters"
        }
      })
      channel.value.description = "a".repeat(5120)
      assert.deepEqual(validateChannelAppearanceEditForm(channel), {})
    })
  })

  describe("validateChannelBasicEditForm", () => {
    it("should complain about no link types being selected", () => {
      const channel = {
        value: {
          link_type: []
        }
      }
      assert.deepEqual(validateChannelBasicEditForm(channel), {
        value: {
          link_type: "At least one of the post type options must be selected"
        }
      })
      channel.value.link_type = [LINK_TYPE_LINK]
      assert.deepEqual(validateChannelBasicEditForm(channel), {})
    })
  })

  describe("validateContentReportForm", () => {
    it("should complain about too long of a description", () => {
      const report = {
        value: {
          reason: "a".repeat(101)
        }
      }
      assert.deepEqual(validateContentReportForm(report), {
        value: {
          reason: "Reason length is limited to 100 characters"
        }
      })
      report.value.reason = "a".repeat(2)
      assert.deepEqual(validateContentReportForm(report), {
        value: {
          reason: "Reason must be at least 3 characters"
        }
      })
      report.value.reason = "a".repeat(100)
      assert.deepEqual(validateContentReportForm(report), {})
      report.value.reason = "a".repeat(3)
      assert.deepEqual(validateContentReportForm(report), {})
    })
  })
})

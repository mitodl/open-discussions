// @flow
/* global SETTINGS:false */
import { assert } from "chai"
import R from "ramda"

import { LINK_TYPE_TEXT, LINK_TYPE_LINK, LINK_TYPE_ARTICLE } from "./channels"
import { assertIsNothing, assertIsJustNoVal } from "./test_utils"
import {
  validation,
  validate,
  validatePostCreateForm,
  validateChannelAppearanceEditForm,
  validateChannelBasicEditForm,
  validateContentReportForm,
  validateEmailForm,
  validateNewEmailForm,
  validateMembersForm,
  validatePasswordForm,
  validatePasswordResetForm,
  validatePasswordChangeForm,
  PASSWORD_LENGTH_MINIMUM,
  validNotMIT
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

    it("should not complain about no text on a text post", () => {
      const post = { value: { postType: LINK_TYPE_TEXT, title: "potato" } }
      assert.deepEqual(validatePostCreateForm(post), {})
    })

    it("should complain about a super long text on a text post", () => {
      const post = {
        value: {
          postType: LINK_TYPE_TEXT,
          title:    "potato",
          text:     R.repeat("a", 40001).join("")
        }
      }
      assert.deepEqual(validatePostCreateForm(post), {
        value: {
          text: "This post is too long. Please reduce the length and try again."
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

    it("should complain about an invalid url on a url post", () => {
      const post = {
        value: { postType: LINK_TYPE_LINK, title: "potato", url: "potato" }
      }
      assert.deepEqual(validatePostCreateForm(post), {
        value: {
          url: "Post url must be a valid url"
        }
      })
    })

    it("should complain about an empty article post", () => {
      const post = {
        value: { postType: LINK_TYPE_ARTICLE, title: "potato", article: [] }
      }
      assert.deepEqual(validatePostCreateForm(post), {
        value: {
          article: "Article must not be empty"
        }
      })
    })

    it("should allow an non-empty article post", () => {
      const post = {
        value: {
          postType: LINK_TYPE_ARTICLE,
          title:    "potato",
          article:  [{ hey: "there" }]
        }
      }
      assert.deepEqual(validatePostCreateForm(post), {})
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
    it("should complain about too long of a headline", () => {
      const channel = {
        value: {
          public_description: "a".repeat(81)
        }
      }
      assert.deepEqual(validateChannelAppearanceEditForm(channel), {
        value: {
          public_description: "Headline length is limited to 80 characters"
        }
      })
      channel.value.public_description = "a".repeat(80)
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

  describe("validNotMIT", () => {
    [
      ["user@mit.edu", true],
      ["user@MIT.EDU", true],
      ["user@test.mit.edu", true],
      ["user@TEST.MIT.edu", true],
      ["user@ALUM.MIT.edu", false],
      ["user@alum.mit.edu", false],
      ["user@other.alum.mit.edu", false],
      ["user@other.school.mit.edu", true],
      ["user@aluminum.mit.edu", true],
      ["user@amit.edu", false],
      ["user@mit.eduu", false],
      ["user@mit.com", false]
    ].forEach(([email, invalid]) => {
      it(`should ${invalid ? "" : "not"} invalidate ${email}`, () => {
        assert.equal(validNotMIT(email), !invalid)
      })
    })
  })

  describe("email validator", () => {
    [
      [validateEmailForm, "existing email", "", "Email is required"],
      [
        validateEmailForm,
        "existing email",
        "abbbb@ddd",
        "Email is not formatted correctly"
      ],
      [validateNewEmailForm, "new email", "", "Email is required"],
      [
        validateNewEmailForm,
        "new email",
        "abbbb@ddd",
        "Email is not formatted correctly"
      ],
      [
        validateNewEmailForm,
        "new email",
        "user@mit.edu",
        "MIT users please login with Touchstone below"
      ]
    ].forEach(
      ([validatorFunc, validatorDesc, emailInput, expectedErrorMsg]) => {
        it(`for ${validatorDesc} should show the right error message given an email='${emailInput}'`, () => {
          SETTINGS.allow_saml_auth = true
          SETTINGS.recaptchaKey = ""
          const form = { value: { email: emailInput } }
          assert.deepEqual(validatorFunc(form), {
            value: {
              email: expectedErrorMsg
            }
          })
        })
      }
    )

    it("for new email should not invalidate an MIT email if allow_saml_auth=false", () => {
      SETTINGS.allow_saml_auth = false
      SETTINGS.recaptchaKey = ""
      const form = { value: { email: "user@mit.edu" } }
      assert.deepEqual(validateNewEmailForm(form), {})
    })

    it(`for new email should validate recaptcha if enabled`, () => {
      SETTINGS.recaptchaKey = "fake"
      const form = {
        value: { email: "user@mit.edu", recaptcha: "fake_response" }
      }
      assert.deepEqual(validateNewEmailForm(form), {})
    })

    it(`for new email should invalidate recaptcha value of null/empty if enabled`, () => {
      [null, ""].forEach(recaptcha => {
        SETTINGS.recaptchaKey = "fake"
        const form = { value: { email: "user@mit.edu", recaptcha } }
        assert.deepEqual(validateNewEmailForm(form), {
          value: {
            recaptcha: "Please verify you're not a robot"
          }
        })
      })
    })
  })

  describe("validateMembersForm", () => {
    it("should complain about no email", () => {
      const form = { value: { email: "" } }
      assert.deepEqual(validateMembersForm(form), {
        value: {
          email: "Email must not be blank"
        }
      })
    })
  })

  describe("validatePasswordForm", () => {
    it("should complain about no password", () => {
      const form = { value: { password: "" } }
      assert.deepEqual(validatePasswordForm(form), {
        value: {
          password: "Password must be at least 8 characters"
        }
      })
    })
  })

  describe("validatePasswordResetForm", () => {
    it("should complain about no password", () => {
      const form = {
        value: { new_password: "", re_new_password: "" }
      }
      assert.deepEqual(validatePasswordResetForm(form), {
        value: {
          new_password: "New password is required"
        }
      })
    })

    it("should complain about password length", () => {
      const form = { value: { new_password: "a", re_new_password: "a" } }
      assert.deepEqual(validatePasswordResetForm(form), {
        value: {
          new_password: `Password must be at least ${PASSWORD_LENGTH_MINIMUM} characters`
        }
      })
    })

    it("should complain about non-matching passwords", () => {
      const form = {
        value: { new_password: "abcdefgh", re_new_password: "01234567" }
      }
      assert.deepEqual(validatePasswordResetForm(form), {
        value: {
          re_new_password: "Passwords must match"
        }
      })
    })
  })

  describe("validatePasswordChangeForm", () => {
    it("should complain about no password", () => {
      const form = {
        value: { current_password: "", new_password: "" }
      }
      assert.deepEqual(validatePasswordChangeForm(form), {
        value: {
          current_password: "Current password is required",
          new_password:     "New password is required"
        }
      })
    })

    it("should complain about password length", () => {
      const form = { value: { current_password: "a", new_password: "a" } }
      assert.deepEqual(validatePasswordChangeForm(form), {
        value: {
          new_password: `Password must be at least ${PASSWORD_LENGTH_MINIMUM} characters`
        }
      })
    })
  })
})

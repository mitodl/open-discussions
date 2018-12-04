// @flow
/* global SETTINGS:false */
import React from "react"
import R from "ramda"
import isURL from "validator/lib/isURL"

import { S } from "./sanctuary"
import { LINK_TYPE_LINK } from "../lib/channels"
import { emptyOrNil } from "../lib/util"

import type { PostForm } from "../flow/discussionTypes"

export const PASSWORD_LENGTH_MINIMUM = 8

// this function checks that a given object fails validation (validator function returns true)
// if it fails, it returns a setter (R.set) which which set the appropirate
// validation message in an object. Else, it returns nothing.
//
// The use pattern is to bind the first three arguments, so that the
// validate function (below) can call that bound function with the object
// to validate.
export const validation = R.curry(
  (validator: Function, lens: Function, message: string, toValidate: Object) =>
    validator(R.view(lens, toValidate), toValidate)
      ? S.Just(R.set(lens, message))
      : S.Nothing
)

// validate takes an array of validations and an object to validate.  A
// validation is a validation function, e.g. as defined above with its first
// three arguments bound (so a validator function, a lens, and a message).
//
// however, any function that takes `toValidate` and returns a setter function
// wrapped in a Just will do.
export const validate = R.curry((validations, toValidate) =>
  R.converge(
    R.compose(
      R.reduce((acc, setter) => setter(acc), {}),
      S.justs,
      Array
    ),
    validations
  )(toValidate)
)

export const validEmail = R.compose(
  R.test(/^\S+@\S+\.\S+$/), // matches any email that matches the format local@domain.tld
  R.trim
)

export const validNotMIT = R.compose(
  R.not,
  R.test(/^.*@(((?!alum\.).)+\.)*mit.edu$/i) // matches any mit.edu email except alum.mit.edu
)

// POST CREATE VALIDATION
export const postURLValidation = (postForm: { value: PostForm }) => {
  if (R.isEmpty(postForm)) {
    return S.Nothing
  }

  const post = postForm.value
  if (post.postType === LINK_TYPE_LINK) {
    if (emptyOrNil(post.url)) {
      return S.Just(
        R.set(R.lensPath(["value", "url"]), "Post url cannot be empty")
      )
    }

    if (!isURL(post.url)) {
      return S.Just(
        R.set(R.lensPath(["value", "url"]), "Post url must be a valid url")
      )
    }
  }

  return S.Nothing
}

export const validatePostCreateForm = validate([
  validation(
    R.compose(
      R.gt(R.__, 300),
      R.length
    ),
    R.lensPath(["value", "title"]),
    "Title length is limited to 300 characters"
  ),
  validation(
    R.compose(
      R.gt(R.__, 40000),
      R.length
    ),
    R.lensPath(["value", "text"]),
    "This post is too long. Please reduce the length and try again."
  ),
  validation(emptyOrNil, R.lensPath(["value", "title"]), "Title is required"),
  postURLValidation
])

export const validateProfileForm = validate([
  validation(emptyOrNil, R.lensPath(["value", "name"]), "Name is required")
])

export const validateUserWebsiteForm = validate([
  validation(
    R.compose(
      R.complement(R.unary(isURL)),
      R.defaultTo("")
    ),
    R.lensPath(["value", "url"]),
    "Must be a valid URL"
  ),
  validation(emptyOrNil, R.lensPath(["value", "url"]), "URL is required")
])

export const validateChannelAppearanceEditForm = validate([
  validation(
    R.compose(
      R.gt(R.__, 80),
      R.length
    ),
    R.lensPath(["value", "public_description"]),
    "Headline length is limited to 80 characters"
  ),
  validation(
    R.isEmpty,
    R.lensPath(["value", "title"]),
    "Title must not be empty"
  )
])

export const validateChannelBasicEditForm = validate([
  validation(
    R.isEmpty,
    R.lensPath(["value", "link_type"]),
    "At least one of the post type options must be selected"
  )
])

export const validateMembersForm = validate([
  validation(
    R.isEmpty,
    R.lensPath(["value", "email"]),
    "Email must not be blank"
  )
])

export const validateImageForm = validate([])

export const validateContentReportForm = validate([
  validation(
    R.compose(
      R.lt(100),
      R.length
    ),
    R.lensPath(["value", "reason"]),
    "Reason length is limited to 100 characters"
  ),
  validation(
    R.compose(
      R.gt(3),
      R.length
    ),
    R.lensPath(["value", "reason"]),
    "Reason must be at least 3 characters"
  )
])

export const validationMessage = (message: ?string) =>
  R.isEmpty(message) || R.isNil(message) ? null : (
    <div className="validation-message">{message}</div>
  )

const emailValidators = [
  validation(
    R.complement(validEmail),
    R.lensPath(["value", "email"]),
    "Email is not formatted correctly"
  ),
  validation(emptyOrNil, R.lensPath(["value", "email"]), "Email is required")
]

export const recaptchaValidator = validation(
  R.complement(recaptcha => {
    return SETTINGS.recaptchaKey ? R.not(emptyOrNil(recaptcha)) : true
  }),
  R.lensPath(["value", "recaptcha"]),
  "Please verify you're not a robot"
)

export const validateEmailForm = validate(emailValidators)

export const validateNewEmailForm = validate(
  R.append(
    recaptchaValidator,
    R.append(
      validation(
        R.complement(email => {
          return SETTINGS.allow_saml_auth ? validNotMIT(email) : true
        }),
        R.lensPath(["value", "email"]),
        "MIT users please login with Touchstone below"
      ),
      emailValidators
    )
  )
)

export const validatePasswordForm = validate([
  validation(
    R.compose(
      R.gt(8),
      R.length
    ),
    R.lensPath(["value", "password"]),
    "Password must be at least 8 characters"
  )
])

export const validateRegisterDetailsForm = validate([
  validation(emptyOrNil, R.lensPath(["value", "name"]), "Name is required"),
  validation(
    emptyOrNil,
    R.lensPath(["value", "password"]),
    "Password is required"
  ),
  validation(
    R.compose(
      R.gt(PASSWORD_LENGTH_MINIMUM),
      R.length
    ),
    R.lensPath(["value", "password"]),
    `Password must be at least ${PASSWORD_LENGTH_MINIMUM} characters`
  )
])

const newPasswordValidations = [
  validation(
    R.compose(
      R.gt(PASSWORD_LENGTH_MINIMUM),
      R.length
    ),
    R.lensPath(["value", "new_password"]),
    `Password must be at least ${PASSWORD_LENGTH_MINIMUM} characters`
  ),
  validation(
    emptyOrNil,
    R.lensPath(["value", "new_password"]),
    "New password is required"
  )
]

export const validatePasswordResetForm = validate(
  R.prepend(
    validation(
      (reNewPassword, form) => reNewPassword !== form.value.new_password,
      R.lensPath(["value", "re_new_password"]),
      "Passwords must match"
    ),
    newPasswordValidations
  )
)

export const validatePasswordChangeForm = validate(
  R.append(
    validation(
      emptyOrNil,
      R.lensPath(["value", "current_password"]),
      "Current password is required"
    ),
    newPasswordValidations
  )
)

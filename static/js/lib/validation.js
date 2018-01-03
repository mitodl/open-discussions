// @flow
import React from "react"
import R from "ramda"

import { S } from "./sanctuary"
import type { PostForm } from "../flow/discussionTypes"

// this function checks that a given object fails validation (validator function returns true)
// if it fails, it returns a setter (R.set) which which set the appropirate
// validation message in an object. Else, it returns nothing.
//
// The use pattern is to bind the first three arguments, so that the
// validate function (below) can call that bound function with the object
// to validate.
export const validation = R.curry(
  (validator: Function, lens: Function, message: string, toValidate: Object) =>
    validator(R.view(lens, toValidate))
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
    R.compose(R.reduce((acc, setter) => setter(acc), {}), S.justs, Array),
    validations
  )(toValidate)
)

const emptyOrNil = R.either(R.isEmpty, R.isNil)

// POST CREATE VALIDATION
export const postUrlOrTextPresent = (postForm: { value: PostForm }) => {
  if (R.isEmpty(postForm)) {
    return S.Nothing
  }

  const post = postForm.value

  if (post.isText && emptyOrNil(post.text)) {
    return S.Just(
      R.set(R.lensPath(["value", "text"]), "Post text cannot be empty")
    )
  }

  if (!post.isText && emptyOrNil(post.url)) {
    return S.Just(
      R.set(R.lensPath(["value", "url"]), "Post url cannot be empty")
    )
  }

  return S.Nothing
}

export const validatePostCreateForm = validate([
  validation(
    R.compose(R.gt(R.__, 300), R.length),
    R.lensPath(["value", "title"]),
    "Title length is limited to 300 characters"
  ),
  validation(emptyOrNil, R.lensPath(["value", "title"]), "Title is required"),
  postUrlOrTextPresent
])

export const validateChannelEditForm = validate([
  validation(
    R.compose(R.gt(R.__, 5120), R.length),
    R.lensPath(["value", "description"]),
    "Description length is limited to 5120 characters"
  )
])

export const validateContentReportForm = validate([
  validation(
    R.compose(R.lt(100), R.length),
    R.lensPath(["value", "reason"]),
    "Reason length is limited to 100 characters"
  ),
  validation(
    R.compose(R.gt(3), R.length),
    R.lensPath(["value", "reason"]),
    "Reason must be at least 3 characters"
  )
])

export const validationMessage = (message: string) =>
  R.isEmpty(message) || R.isNil(message)
    ? null
    : <div className="validation-message">
      {message}
    </div>

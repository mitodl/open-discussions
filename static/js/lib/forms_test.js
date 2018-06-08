// @flow
import { assert } from "chai"

import { configureForm } from "./forms"
import {
  FORM_BEGIN_EDIT,
  FORM_END_EDIT,
  FORM_UPDATE,
  FORM_VALIDATE
} from "../actions/forms"

describe("forms lib", () => {
  const formKey = "testform"

  describe("configureForm", () => {
    it("returns a getForm function that fetches the form from state", () => {
      const { getForm } = configureForm(formKey, () => ({}))
      assert.equal(
        getForm({
          forms: {
            [formKey]: "abc"
          }
        }),
        "abc"
      )
    })

    it("returns an actionCreator function that begins editing the form", () => {
      const value = {
        name: "sally"
      }
      const {
        actionCreators: { formBeginEdit }
      } = configureForm(formKey, () => value)

      assert.deepEqual(formBeginEdit(), {
        payload: {
          formKey,
          value
        },
        type: FORM_BEGIN_EDIT
      })
    })

    it("returns an actionCreator function that ends editing the form", () => {
      const {
        actionCreators: { formEndEdit }
      } = configureForm(formKey, () => ({}))

      assert.deepEqual(formEndEdit(), {
        payload: { formKey },
        type:    FORM_END_EDIT
      })
    })

    it("returns an actionCreator function that updates the form", () => {
      const value = {
        name: "sam"
      }
      const {
        actionCreators: { formUpdate }
      } = configureForm(formKey, () => ({}))

      assert.deepEqual(formUpdate(value), {
        payload: {
          formKey,
          value
        },
        type: FORM_UPDATE
      })
    })

    it("returns an actionCreator function that validates the form", () => {
      const errors = {
        name: "name is required"
      }
      const {
        actionCreators: { formValidate }
      } = configureForm(formKey, () => ({}))

      assert.deepEqual(formValidate(errors), {
        payload: {
          formKey,
          errors
        },
        type: FORM_VALIDATE
      })
    })
  })
})

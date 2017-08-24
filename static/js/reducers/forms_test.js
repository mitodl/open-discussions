// @flow
import { assert } from "chai"
import sinon from "sinon"
import configureTestStore from "redux-asserts"

import rootReducer from "../reducers"
import { actions } from "../actions"

describe("forms reducer", () => {
  const formKey = "mykey"
  const value = {
    prop: "prop1"
  }
  const payload = { formKey, value }
  let sandbox, store, dispatchThen

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    store = configureTestStore(rootReducer)
    dispatchThen = store.createDispatchThen(state => state.forms)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should have some initial state", () => {
    assert.deepEqual(store.getState().forms, {})
  })

  it("should intialize the form", () => {
    return dispatchThen(actions.forms.formBeginEdit(payload), [
      actions.forms.FORM_BEGIN_EDIT
    ]).then(forms => {
      assert.deepEqual(forms, {
        [formKey]: {
          value:  value,
          errors: {}
        }
      })
    })
  })

  it("should update the form state", () => {
    const prom = dispatchThen(actions.forms.formBeginEdit(payload), [
      actions.forms.FORM_BEGIN_EDIT,
      actions.forms.FORM_UPDATE
    ]).then(forms => {
      assert.deepEqual(forms, {
        [formKey]: {
          value:  { prop: "prop2" },
          errors: {}
        }
      })
    })
    store.dispatch(
      actions.forms.formUpdate({ formKey, value: { prop: "prop2" } })
    )
    return prom
  })

  it("should clear the form state", () => {
    const prom = dispatchThen(actions.forms.formBeginEdit(payload), [
      actions.forms.FORM_BEGIN_EDIT,
      actions.forms.FORM_BEGIN_EDIT,
      actions.forms.FORM_END_EDIT
    ]).then(forms => {
      assert.deepEqual(forms, {
        otherkey: {
          value:  value,
          errors: {}
        }
      })
    })
    store.dispatch(actions.forms.formBeginEdit({ formKey: "otherkey", value }))
    store.dispatch(actions.forms.formEndEdit({ formKey }))
    return prom
  })
})

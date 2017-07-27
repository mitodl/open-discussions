// @flow
import { combineReducers } from "redux"
import configureTestStore from "redux-asserts"
import { assert } from "chai"
import sinon from "sinon"

import { deriveActionTypes, deriveActions, deriveReducer } from "./form_actions"

describe("Form actions", () => {
  describe("deriveActionTypes", () => {
    it("should return correct action type values", () => {
      assert.deepEqual(deriveActionTypes("channels"), {
        create: "FORM_CHANNELS_CREATE",
        update: "FORM_CHANNELS_UPDATE",
        reset:  "FORM_CHANNELS_RESET"
      })
    })
  })

  describe("deriveActions", () => {
    it("should return correct action functions", () => {
      const actions = deriveActions("channels")
      assert.equal(actions.create().type, "FORM_CHANNELS_CREATE")
      assert.equal(actions.update({}).type, "FORM_CHANNELS_UPDATE")
      assert.equal(actions.reset().type, "FORM_CHANNELS_RESET")
    })
  })

  describe("deriveReducer", () => {
    const defaultValue = {
      name: "channelone"
    }
    const channels = deriveReducer("channels", () => defaultValue)
    const actions = deriveActions("channels")
    let sandbox, store, dispatchThen
    beforeEach(() => {
      sandbox = sinon.sandbox.create()
      store = configureTestStore(combineReducers({ channels }))
      dispatchThen = store.createDispatchThen(state => state.channels)
    })

    afterEach(() => {
      sandbox.restore()
    })

    it("should return the default state when initialized", () => {
      assert.deepEqual(store.getState(), {
        channels: {
          value:  null,
          errors: {}
        }
      })
    })

    it("create action should set the default value", () => {
      return dispatchThen(actions.create(), []).then(state => {
        assert.deepEqual(state, {
          value:  defaultValue,
          errors: {}
        })
      })
    })

    it("update action should perform a merged update of the value", () => {
      store.dispatch(actions.create())
      return dispatchThen(
        actions.update({
          name2: "channeltwo"
        }),
        []
      ).then(state => {
        assert.deepEqual(state, {
          value: {
            name:  "channelone",
            name2: "channeltwo"
          },
          errors: {}
        })
      })
    })

    it("reset should reset the state back to defaults", () => {
      store.dispatch(actions.create())
      store.dispatch(actions.update({ name: "channeltwo" }))
      assert.deepEqual(store.getState(), {
        channels: {
          value: {
            name: "channeltwo"
          },
          errors: {}
        }
      })
      return dispatchThen(actions.reset(), []).then(state => {
        assert.deepEqual(state, {
          value:  defaultValue,
          errors: {}
        })
      })
    })
  })
})

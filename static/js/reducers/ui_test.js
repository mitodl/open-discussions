// @flow
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import { INITIAL_UI_STATE } from "./ui"
import {
  SET_SHOW_DRAWER_DESKTOP,
  SET_SHOW_DRAWER_MOBILE,
  SET_SNACKBAR_MESSAGE,
  SHOW_DIALOG,
  HIDE_DIALOG,
  SET_SHOW_USER_MENU,
  setShowDrawerDesktop,
  setShowDrawerMobile,
  setSnackbarMessage,
  showDialog,
  hideDialog,
  setShowUserMenu
} from "../actions/ui"

describe("ui reducer", () => {
  let helper, store, dispatchThen

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    dispatchThen = store.createDispatchThen(state => state.ui)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should have some default state", () => {
    assert.deepEqual(store.getState().ui, INITIAL_UI_STATE)
  })

  it("should let you toggle desktop drawer visibility", async () => {
    let state = await dispatchThen(setShowDrawerDesktop(true), [
      SET_SHOW_DRAWER_DESKTOP
    ])
    assert.isTrue(state.showDrawerDesktop)
    state = await dispatchThen(setShowDrawerDesktop(false), [
      SET_SHOW_DRAWER_DESKTOP
    ])
    assert.isFalse(state.showDrawerDesktop)
  })

  it("should let you toggle mobile drawer visibility", async () => {
    let state = await dispatchThen(setShowDrawerMobile(true), [
      SET_SHOW_DRAWER_MOBILE
    ])
    assert.isTrue(state.showDrawerMobile)
    state = await dispatchThen(setShowDrawerMobile(false), [
      SET_SHOW_DRAWER_MOBILE
    ])
    assert.isFalse(state.showDrawerMobile)
  })

  it("should set snackbar message", async () => {
    const payload = {
      message: "hey there!"
    }
    let state = await dispatchThen(setSnackbarMessage(payload), [
      SET_SNACKBAR_MESSAGE
    ])

    assert.deepEqual(state.snackbar, {
      id: 0,
      ...payload
    })

    state = await dispatchThen(setSnackbarMessage(payload), [
      SET_SNACKBAR_MESSAGE
    ])

    assert.deepEqual(state.snackbar, {
      id: 1,
      ...payload
    })
  })

  it("should let you show and hide a dialog", async () => {
    const dialogKey = "key!"
    let state = await dispatchThen(showDialog(dialogKey), [SHOW_DIALOG])
    assert.isTrue(state.dialogs.has(dialogKey))
    state = await dispatchThen(hideDialog(dialogKey), [HIDE_DIALOG])
    assert.isFalse(state.dialogs.has(dialogKey))
  })

  it("should support multiple dialogs at once", async () => {
    const keys = ["key!", "a dialog", "my great dialog key"]
    keys.forEach(async key => {
      await dispatchThen(showDialog(key), [SHOW_DIALOG])
    })
    const dialogs = store.getState().ui.dialogs
    assert.deepEqual(keys, [...dialogs.keys()])
  })

  it("should let you toggle show user menu", async () => {
    for (const open of [true, false]) {
      const state = await dispatchThen(setShowUserMenu(open), [
        SET_SHOW_USER_MENU
      ])
      assert.equal(state.showUserMenu, open)
    }
  })
})

// @flow
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import { INITIAL_UI_STATE } from "./ui"
import {
  SET_SHOW_DRAWER_DESKTOP,
  SET_SHOW_DRAWER_MOBILE,
  SET_SHOW_DRAWER_HOVER,
  SET_SNACKBAR_MESSAGE,
  SHOW_DIALOG,
  HIDE_DIALOG,
  SET_DIALOG_DATA,
  SHOW_DROPDOWN,
  HIDE_DROPDOWN,
  SET_BANNER_MESSAGE,
  HIDE_BANNER,
  PUSH_LR_HISTORY,
  POP_LR_HISTORY,
  CLEAR_LR_HISTORY,
  setShowDrawerDesktop,
  setShowDrawerMobile,
  setShowDrawerHover,
  setSnackbarMessage,
  showDialog,
  hideDialog,
  setDialogData,
  showDropdown,
  hideDropdown,
  setBannerMessage,
  hideBanner,
  pushLRHistory,
  popLRHistory,
  clearLRHistory
} from "../actions/ui"
import { USER_MENU_DROPDOWN } from "../pages/App"

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

  it("should let you toggle desktop drawer hover state", async () => {
    let state = await dispatchThen(setShowDrawerHover(true), [
      SET_SHOW_DRAWER_HOVER
    ])
    assert.isTrue(state.showDrawerHover)
    state = await dispatchThen(setShowDrawerHover(false), [
      SET_SHOW_DRAWER_HOVER
    ])
    assert.isFalse(state.showDrawerHover)
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
  ;[true, false].forEach(show => {
    it(`should let you ${show ? "show" : "hide"} a dialog`, async () => {
      const dialogKey = "key!"
      const data = { a: { b: "c" } }
      const actionFunc = show ? showDialog : hideDialog
      const actionType = show ? SHOW_DIALOG : HIDE_DIALOG

      await dispatchThen(showDialog(dialogKey), [SHOW_DIALOG])
      let state = await dispatchThen(setDialogData({ dialogKey, data }), [
        SET_DIALOG_DATA
      ])
      // make sure we start with dialog state so we can assert that it's cleared
      assert.deepEqual(state.dialogs.get(dialogKey), data)

      state = await dispatchThen(actionFunc(dialogKey), [actionType])
      assert.equal(state.dialogs.has(dialogKey), show)
      assert.equal(state.dialogs.get(dialogKey), null)
    })
  })

  it("should set data for the dialog", async () => {
    const dialogKey = "key!"
    const data = [1, 2, 3]
    await dispatchThen(showDialog(dialogKey), [SHOW_DIALOG])
    const state = await dispatchThen(setDialogData({ dialogKey, data }), [
      SET_DIALOG_DATA
    ])
    // make sure we start with dialog state so we can assert that it's cleared
    assert.deepEqual(state.dialogs.get(dialogKey), data)
  })

  it("should support multiple dialogs at once", async () => {
    const keys = ["key!", "a dialog", "my great dialog key"]
    keys.forEach(async key => {
      await dispatchThen(showDialog(key), [SHOW_DIALOG])
    })
    const dialogs = store.getState().ui.dialogs
    assert.deepEqual(keys, [...dialogs.keys()])
  })

  it("should let you toggle show dropdown", async () => {
    for (const key of [USER_MENU_DROPDOWN, "some other key"]) {
      let state = await dispatchThen(showDropdown(key), [SHOW_DROPDOWN])
      assert.equal(state.dropdownMenus.has(key), true)
      state = await dispatchThen(hideDropdown(key), [HIDE_DROPDOWN])
      assert.equal(state.dropdownMenus.has(key), false)
      assert.instanceOf(state.dropdownMenus, Set)
    }
  })

  it("should let you set the banner message", async () => {
    const message = "some message"
    let state = await dispatchThen(setBannerMessage("some message"), [
      SET_BANNER_MESSAGE
    ])
    assert.deepEqual(state.banner, {
      message: message,
      visible: true
    })
    state = await dispatchThen(hideBanner(), [HIDE_BANNER])
    assert.deepEqual(state.banner, {
      message: "",
      visible: false
    })
  })

  it("should let you push to the LR history", async () => {
    const state = await dispatchThen(
      pushLRHistory({ objectId: "HEY!", objectType: "best", runId: 1 }),
      [PUSH_LR_HISTORY]
    )
    assert.deepEqual(state.LRDrawerHistory, [
      { objectId: "HEY!", objectType: "best", runId: 1 }
    ])
  })

  it("should let you pop an entry off the LR history", async () => {
    await dispatchThen(
      pushLRHistory({ objectId: "HEY!", objectType: "best", runId: 1 }),
      [PUSH_LR_HISTORY]
    )
    await dispatchThen(
      pushLRHistory({ objectId: "second one", objectType: "worst", runId: 1 }),
      [PUSH_LR_HISTORY]
    )
    const state = await dispatchThen(popLRHistory(), [POP_LR_HISTORY])
    assert.deepEqual(state.LRDrawerHistory, [
      { objectId: "HEY!", objectType: "best", runId: 1 }
    ])
  })

  it("should let you clear the LR history", async () => {
    await dispatchThen(
      pushLRHistory({ objectId: "HEY!", objectType: "best", runId: 1 }),
      [PUSH_LR_HISTORY]
    )
    await dispatchThen(
      pushLRHistory({ objectId: "second one", objectType: "worst", runId: 1 }),
      [PUSH_LR_HISTORY]
    )
    const state = await dispatchThen(clearLRHistory(), [CLEAR_LR_HISTORY])
    assert.deepEqual(state.LRDrawerHistory, [])
  })
})

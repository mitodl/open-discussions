import { assert } from "chai"
import sinon from "sinon"
import configureTestStore from "redux-asserts"

import {
  startPhotoEdit,
  START_PHOTO_EDIT,
  clearPhotoEdit,
  CLEAR_PHOTO_EDIT,
  updatePhotoEdit,
  UPDATE_PHOTO_EDIT,
  setPhotoError,
  SET_PHOTO_ERROR,
  REQUEST_PATCH_PHOTO,
  RECEIVE_PATCH_PHOTO_SUCCESS,
  requestPatchPhoto,
  RECEIVE_PATCH_PHOTO_FAILURE
} from "../actions/image_upload"
import { INITIAL_IMAGE_UPLOAD_STATE, updateProfilePhoto } from "./image_upload"
import {
  FETCH_FAILURE,
  FETCH_PROCESSING,
  FETCH_SUCCESS
} from "../actions/image_upload"
import rootReducer from "../reducers"
import * as api from "../lib/api"

describe("image upload reducer", () => {
  let sandbox, store, dispatchThen
  let patchProfileImageStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    store = configureTestStore(rootReducer)
    dispatchThen = store.createDispatchThen(state => state.imageUpload)
    patchProfileImageStub = sandbox.stub(api, "patchProfileImage")
  })

  afterEach(() => {
    sandbox.restore()
    store = null
    dispatchThen = null
  })

  it("should have some initial state", () => {
    return dispatchThen({ type: "unknown" }, ["unknown"]).then(state => {
      assert.deepEqual(state, INITIAL_IMAGE_UPLOAD_STATE)
    })
  })

  it("should let you set an error", () => {
    return dispatchThen(setPhotoError("an error"), [SET_PHOTO_ERROR]).then(
      state => {
        assert.deepEqual(state, {
          edit:        null,
          error:       "an error",
          photo:       null,
          patchStatus: null
        })
      }
    )
  })

  it("should start editing a photo", () => {
    return dispatchThen(startPhotoEdit("a photo"), [START_PHOTO_EDIT]).then(
      state => {
        assert.deepEqual(state, {
          edit:        null,
          error:       null,
          photo:       "a photo",
          patchStatus: null
        })
      }
    )
  })

  it("should clear any errors when beginning to edit", () => {
    store.dispatch(setPhotoError("an error"))
    return dispatchThen(startPhotoEdit("a photo"), [START_PHOTO_EDIT]).then(
      state => {
        assert.deepEqual(state, {
          edit:        null,
          error:       null,
          photo:       "a photo",
          patchStatus: null
        })
      }
    )
  })

  it("should let you update an edit in progress", () => {
    const first = new Blob()
    const second = new Blob()
    store.dispatch(startPhotoEdit(first))

    return dispatchThen(updatePhotoEdit(second), [UPDATE_PHOTO_EDIT]).then(
      state => {
        assert.deepEqual(state, {
          edit:        second,
          error:       null,
          photo:       first,
          patchStatus: null
        })
      }
    )
  })

  it("should clear an edit in progress", () => {
    store.dispatch(startPhotoEdit("a photo"))
    return dispatchThen(clearPhotoEdit(), [CLEAR_PHOTO_EDIT]).then(state => {
      assert.deepEqual(state, {
        edit:        null,
        error:       null,
        photo:       null,
        patchStatus: null
      })
    })
  })

  describe("PATCHING the photo", () => {
    const user = "jane"
    const photo = new Blob()
    const filename = "a photo"

    it("should patch the profile image", () => {
      patchProfileImageStub
        .withArgs(user, photo, filename)
        .returns(Promise.resolve("success"))
      return dispatchThen(updateProfilePhoto(user, photo, filename), [
        REQUEST_PATCH_PHOTO,
        RECEIVE_PATCH_PHOTO_SUCCESS
      ]).then(state => {
        assert.deepEqual(state, {
          edit:        null,
          error:       null,
          photo:       null,
          patchStatus: FETCH_SUCCESS
        })
      })
    })

    it("should fail to patch the profile image", () => {
      patchProfileImageStub.returns(Promise.reject("oops"))

      return dispatchThen(updateProfilePhoto(user, photo, filename), [
        REQUEST_PATCH_PHOTO,
        RECEIVE_PATCH_PHOTO_FAILURE
      ]).then(state => {
        assert.deepEqual(state, {
          edit:        null,
          error:       null,
          photo:       null,
          patchStatus: FETCH_FAILURE
        })
      })
    })

    it("should set FETCH_PROCESSING while updating", () => {
      const photo = new Blob()
      store.dispatch(startPhotoEdit(photo))
      return dispatchThen(requestPatchPhoto(), [REQUEST_PATCH_PHOTO]).then(
        state => {
          assert.deepEqual(state, {
            edit:        null,
            error:       null,
            photo:       photo,
            patchStatus: FETCH_PROCESSING
          })
        }
      )
    })

    it("should not clear the edit state if FETCH_PROCESSING", () => {
      const photo = new Blob()
      store.dispatch(startPhotoEdit(photo))
      store.dispatch(requestPatchPhoto())
      const expectation = {
        edit:        null,
        error:       null,
        photo:       photo,
        patchStatus: FETCH_PROCESSING
      }
      let state = store.getState().imageUpload
      assert.deepEqual(state, expectation)
      store.dispatch(clearPhotoEdit())
      state = store.getState().imageUpload
      assert.deepEqual(state, expectation)
      assert.deepEqual(state, expectation)
      store.dispatch(startPhotoEdit(photo))
      state = store.getState().imageUpload
      assert.deepEqual(state, expectation)
    })
  })
})

// @flow
import { assert } from "chai"

import {
  anyProcessing,
  allLoaded,
  anyError,
  anyErrorExcept404,
  any404Error,
  anyNotAuthorizedErrorType,
  NOT_AUTHORIZED_ERROR_TYPE
} from "./rest"

const makeError = n => ({ error: { errorStatusCode: n } })
const makeErrorType = e => ({ error: { error_type: e } })

describe("rest utils", () => {
  describe("anyProcessing", () => {
    it("should return false if nothing has processing true", () => {
      assert.isFalse(anyProcessing([{}, { bip: "bop" }, { processing: false }]))
    })

    it("should return false for an empty array", () => {
      assert.isFalse(anyProcessing([]))
    })

    it("should return true if one object has processing true", () => {
      assert.isTrue(
        anyProcessing([
          {},
          { bip: "bop" },
          { processing: false },
          { processing: true }
        ])
      )
    })

    it("should return true if all objects have processing true", () => {
      assert.isTrue(
        anyProcessing([
          { bip: "bop", processing: true },
          { processing: true },
          { processing: true }
        ])
      )
    })
  })

  describe("allLoaded", () => {
    it("should return false if one does not have loaded true", () => {
      assert.isFalse(
        allLoaded([{}, { bip: "bop" }, { loaded: true }, { loaded: false }])
      )
    })

    it("should return false for empty array", () => {
      assert.isFalse(allLoaded([]))
    })

    it("should return true if all have loaded true", () => {
      assert.isTrue(
        allLoaded([{ loaded: true }, { loaded: true, other: "prop" }])
      )
    })
  })

  describe("anyError", () => {
    it("should return false for empty array", () => {
      assert.isFalse(anyError([]))
    })

    it("should return false if none have an error prop", () => {
      assert.isFalse(anyError([{}, { bip: "bop" }, { loaded: true }]))
    })

    it("should return true if any have an error prop", () => {
      assert.isTrue(anyError([{}, { bip: "bop" }, { error: ":(" }]))
    })
  })

  describe("anyErrorExcept404", () => {
    it("should return false for an empty array", () => {
      assert.isFalse(anyErrorExcept404([]))
    })

    it("should return true if errors lack codes", () => {
      assert.isTrue(anyErrorExcept404([{}, { bip: "bop" }, { error: {} }]))
    })

    it("should return true if some or all codes are not 404", () => {
      assert.isTrue(anyErrorExcept404([makeError(401), makeError(404)]))
      assert.isTrue(anyErrorExcept404([makeError(401), makeError(500)]))
    })

    it("should return false if all codes are 404", () => {
      assert.isFalse(anyErrorExcept404([makeError(404), makeError(404)]))
    })
  })

  describe("any404Error", () => {
    it("should return false for empty array", () => {
      assert.isFalse(any404Error([]))
    })

    it("should return false if all codes are not 404", () => {
      assert.isFalse(
        any404Error([
          makeError(303),
          makeError(400),
          makeError(500),
          { error: {} }
        ])
      )
    })

    it("should return true if some or all codes are 404", () => {
      assert.isTrue(
        any404Error([makeError(404), makeError(500), makeError(4932)])
      )

      assert.isTrue(
        any404Error([makeError(404), makeError(404), makeError(404)])
      )
    })
  })

  describe("anyNotAuthorizedErrorType", () => {
    it("should return false for empty array", () => {
      assert.isFalse(anyNotAuthorizedErrorType([]))
    })

    it("should return false if all codes are not NotAuthorized", () => {
      assert.isFalse(
        anyNotAuthorizedErrorType([
          makeErrorType("Some"),
          makeErrorType("Other"),
          makeErrorType("Error"),
          { data: {} }
        ])
      )
    })

    it("should return true if some or all codes are NotAuthorized", () => {
      assert.isTrue(
        anyNotAuthorizedErrorType([
          makeErrorType(NOT_AUTHORIZED_ERROR_TYPE),
          makeErrorType("Not"),
          makeErrorType("It")
        ])
      )

      assert.isTrue(
        anyNotAuthorizedErrorType([
          makeErrorType("Not"),
          makeErrorType("It"),
          makeErrorType(NOT_AUTHORIZED_ERROR_TYPE)
        ])
      )
    })
  })
})

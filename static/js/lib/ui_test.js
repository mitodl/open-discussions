// @flow
import sinon from "sinon"
import { assert } from "chai"

import { dropdownMenuFuncs } from "./ui"
import { SHOW_DROPDOWN, HIDE_DROPDOWN } from "../actions/ui"

describe("ui lib", () => {
  it("should return two functions", () => {
    const { showDropdown, hideDropdown } = dropdownMenuFuncs(
      sinon.stub(),
      "key"
    )
    assert.isFunction(showDropdown)
    assert.isFunction(hideDropdown)
  })

  //
  ;[["showDropdown", SHOW_DROPDOWN], ["hideDropdown", HIDE_DROPDOWN]].forEach(
    ([funcName, actionType]) => {
      it(`should call ${funcName} to dispatch ${actionType} with key`, () => {
        const dispatchStub = sinon.stub()
        const func = dropdownMenuFuncs(dispatchStub, "a key")[funcName]
        func()

        sinon.assert.called(dispatchStub)
        const [[{ type, payload }]] = dispatchStub.args
        assert.equal(type, actionType)
        assert.equal(payload, "a key")
      })
    }
  )
})

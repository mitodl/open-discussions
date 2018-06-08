// @flow
import { assert } from "chai"
import sinon from "sinon"

import { mergeAndInjectProps } from "./redux_props"

describe("redux_props", () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe("mergeAndInjectProps", () => {
    it("should pass stateProps, dispatchProps, and ownProps into the passed method", () => {
      const injectProps = sandbox.stub().returns({ d: 4, e: 4 })

      const mergeFunc = mergeAndInjectProps(injectProps)
      // this is the order they get applied in
      // structure them so that they each override, update, and add a prop
      const ownProps = { a: 1, b: 1 }
      const stateProps = { b: 2, c: 2, z: 2 }
      const dispatchProps = { c: 3, d: 3, y: 3 }

      assert.deepEqual(mergeFunc(stateProps, dispatchProps, ownProps), {
        a: 1,
        b: 2,
        z: 2,
        c: 3,
        y: 3,
        d: 4,
        e: 4
      })
      assert.ok(injectProps.calledWith(stateProps, dispatchProps, ownProps))
    })
  })
})

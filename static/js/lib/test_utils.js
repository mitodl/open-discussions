// @flow
import React from "react"
import sinon from "sinon"
import R from "ramda"
import { assert } from "chai"
import { shallow } from "enzyme"

import { makeCourse } from "../factories/resources"
import { S } from "./sanctuary"
const { Maybe } = S

export const assertMaybeEquality = (m1: Maybe, m2: Maybe) => {
  assert(S.equals(m1, m2), `expected ${m1.value} to equal ${m2.value}`)
}

export const assertIsNothing = (m: Maybe) => {
  assert(m.isNothing, `should be nothing, is ${m}`)
}

export const assertIsJust = (m: Maybe, val: any) => {
  assert(m.isJust, `should be Just(${val}), is ${m}`)
  assert.deepEqual(m.value, val)
}

export const assertIsJustNoVal = (m: Maybe) => {
  assert(m.isJust, "should be a Just")
}

export const shouldIf = (tf: boolean) => (tf ? "should" : "should not")

export const shouldIfGt0 = (num: number) => shouldIf(num > 0)

export const isIf = (tf: boolean) => (tf ? "is" : "is not")

export class TestPage extends React.Component<*, *> {
  props: {}

  render() {
    return <div />
  }
}

export const configureShallowRenderer = (
  Component: Class<React.Component<*, *>> | Function,
  defaultProps: Object
) => (extraProps: Object = {}) =>
  shallow(<Component {...defaultProps} {...extraProps} />)

export const makeEvent = (name: string, value: any) => ({
  target:         { value, name },
  preventDefault: sinon.stub()
})

export const mockCourseAPIMethods = (helper: Object) => {
  helper.newCoursesSelectorStub.returns(R.times(makeCourse, 10))
  helper.newCoursesRequestStub.returns({})
  helper.upcomingCoursesSelectorStub.returns(R.times(makeCourse, 10))
  helper.upcomingCoursesRequestStub.returns({})
}

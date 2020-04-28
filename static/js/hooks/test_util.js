// @flow
import React from "react"

export const hookClickTestHarness = (hook: Function) => {
  function TestHarness(props: Object) {
    const { hookArgs } = props

    const clickHandler = hook(hookArgs)

    return <div onClick={clickHandler} />
  }
  return TestHarness
}

export const genericTestHarness = (hook: Function) => {
  function TestHarness() {
    hook()
    return <div />
  }
  return TestHarness
}

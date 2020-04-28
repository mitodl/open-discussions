// @flow
import React, { useEffect, useRef } from "react"

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

export const hookReturnTestHarness = (hook: Function) => {
  function TestHarness(props: Object) {
    const { cb } = props
    const result = hook()
    cb(result)
    return <div />
  }
  return TestHarness
}

export const renderCountTestHarness = (hook: Function) => {
  function PropRecipient() {
    // this is just a dummy component because React complains
    // if you pass arbitrary props to e.g. a div or p tag
    return <div />
  }

  function TestHarness() {
    const ref = useRef(1)

    useEffect(() => {
      ref.current = ref.current + 1
    })

    hook()

    return <PropRecipient renderCount={ref.current} />
  }
  return TestHarness
}

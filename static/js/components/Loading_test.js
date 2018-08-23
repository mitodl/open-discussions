// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"

import Loading from "./Loading"
import { NotFound, NotAuthorized } from "../components/ErrorPages"

class Content extends React.Component<*> {
  render() {
    return <div>CONTENT</div>
  }
}

describe("Loading", () => {
  let props

  beforeEach(() => {
    props = {
      loaded:        true,
      errored:       false,
      notFound:      false,
      notAuthorized: false
    }
  })

  const renderLoading = () => {
    return mount(
      <Loading {...props}>
        <Content />
      </Loading>
    )
  }

  it("should show a spinner if not loaded and not errored", () => {
    props.loaded = false
    const wrapper = renderLoading()
    assert.lengthOf(wrapper.find(".loading").find(".sk-three-bounce"), 1)
  })

  it("should render errors correctly if not loaded", () => {
    props.loaded = false
    props.errored = true
    const wrapper = renderLoading()
    assert.equal(wrapper.text(), "Error loading page")
  })

  it("should render errors correctly if loaded", () => {
    props.loaded = true
    props.errored = true
    const wrapper = renderLoading()
    assert.equal(wrapper.text(), "Error loading page")
  })

  it("should show NotFound if notFound", () => {
    props.notFound = true
    const wrapper = renderLoading()
    assert.ok(wrapper.find(NotFound).exists())
  })

  it("should show NotAuthorized if notAuthorized", () => {
    props.notAuthorized = true
    const wrapper = renderLoading()
    assert.ok(wrapper.find(NotAuthorized).exists())
  })

  it("should the contents if no errors and loaded", () => {
    const wrapper = renderLoading()
    assert.equal(wrapper.text(), "CONTENT")
  })
})

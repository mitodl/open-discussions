// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"

import withLoading from "./Loading"

class Content extends React.Component<*, void> {
  render() {
    return <div>CONTENT</div>
  }
}

const LoadingContent = withLoading(Content)

describe("Loading", () => {
  const renderLoading = (loaded: boolean, errored: boolean) => {
    return mount(<LoadingContent loaded={loaded} errored={errored} />)
  }

  it("should show a spinner if not loaded and not errored", () => {
    const wrapper = renderLoading(false, false)
    assert.lengthOf(wrapper.find(".loading").find(".sk-three-bounce"), 1)
  })

  it("should render errors correctly if not loaded", () => {
    const wrapper = renderLoading(false, true)
    assert.equal(wrapper.text(), "Error loading page")
  })

  it("should render errors correctly if loaded", () => {
    const wrapper = renderLoading(true, true)
    assert.equal(wrapper.text(), "Error loading page")
  })

  it("should the contents if no errors and loaded", () => {
    const wrapper = renderLoading(true, false)
    assert.equal(wrapper.text(), "CONTENT")
  })
})

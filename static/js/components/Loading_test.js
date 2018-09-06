// @flow
import React from "react"
import { assert } from "chai"
import { shallow, mount } from "enzyme"

import withLoading, { Loading } from "./Loading"
import { NotFound, NotAuthorized } from "../components/ErrorPages"

class Content extends React.Component<*> {
  render() {
    return <div>CONTENT</div>
  }
}

const LoadingContent = withLoading(Content)

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
    return mount(<LoadingContent {...props} />)
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
  ;[["notFound", NotFound], ["notAuthorized", NotAuthorized]].forEach(
    ([propName, expectedComponent]) => {
      it(`should show ${expectedComponent.displayName} if ${propName}`, () => {
        props[propName] = true
        const wrapper = renderLoading()
        assert.ok(wrapper.find(expectedComponent).exists())
      })
    }
  )

  it("should the contents if no errors and loaded", () => {
    const wrapper = renderLoading()
    assert.equal(wrapper.text(), "CONTENT")
  })

  it("passes the className to the containing div", () => {
    const wrapper = shallow(<Loading className="abc xyz" />)
    assert.equal(wrapper.props().className, "loading abc xyz")
  })
})

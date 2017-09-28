// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import { Link } from "react-router-dom"

import PostListNavigation from "./PostListNavigation"

describe("PostListNavigation", () => {
  describe("component", () => {
    const defaultProps = {
      pathname:    "/",
      after:       undefined,
      afterCount:  undefined,
      before:      undefined,
      beforeCount: undefined
    }
    const renderComponent = (props = defaultProps) =>
      shallow(<PostListNavigation {...props} />)

    it("should show nothing if no pagination values provided", () => {
      const wrapper = renderComponent()
      assert.lengthOf(wrapper.find(Link), 0)
    })

    it("renders a next link with the correct URL", () => {
      const wrapper = renderComponent({
        ...defaultProps,
        after:      "abc",
        afterCount: 5,
        pathname:   "/channel/foobar"
      })
      const link = wrapper.find(Link)
      assert.deepEqual(link.props().to, {
        pathname: "/channel/foobar",
        search:   "?after=abc&count=5"
      })
      assert.equal(link.props().children, "next >")
    })

    it("renders a previous link with the correct URL", () => {
      const wrapper = renderComponent({
        ...defaultProps,
        before:      "abc",
        beforeCount: 5,
        pathname:    "/channel/foobar"
      })
      const link = wrapper.find(Link)
      assert.deepEqual(link.props().to, {
        pathname: "/channel/foobar",
        search:   "?before=abc&count=5"
      })
      assert.equal(link.props().children, "< previous")
    })

    it("renders both a previous and next link with the correct URLs", () => {
      const wrapper = renderComponent({
        ...defaultProps,
        before:      "abc",
        beforeCount: 5,
        after:       "abc",
        afterCount:  5,
        pathname:    "/channel/foobar"
      })
      const links = wrapper.find(Link)
      assert.deepEqual(links.at(0).props().to, {
        pathname: "/channel/foobar",
        search:   "?before=abc&count=5"
      })
      assert.equal(links.at(0).props().children, "< previous")
      assert.deepEqual(links.at(1).props().to, {
        pathname: "/channel/foobar",
        search:   "?after=abc&count=5"
      })
      assert.equal(links.at(1).props().children, "next >")
    })
  })
})

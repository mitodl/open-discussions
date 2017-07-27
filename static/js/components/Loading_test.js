// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import Loading from "./Loading"

describe("Loading", () => {
  const renderLoading = restStates =>
    shallow(<Loading restStates={restStates} renderContents={() => <div>CONTENT</div>} />)

  describe("should render loading correctly", () => {
    it("single state with loaded:false", () => {
      const wrapper = renderLoading([
        {
          loaded:     false,
          processing: false
        }
      ])
      assert.equal(wrapper.text(), "Loading")
    })

    it("multiple states with one loaded:false", () => {
      const wrapper = renderLoading([
        {
          loaded:     true,
          processing: false
        },
        {
          loaded:     false,
          processing: false
        }
      ])
      assert.equal(wrapper.text(), "Loading")
    })

    it("single state with processing:true", () => {
      const wrapper = renderLoading([
        {
          loaded:     false,
          processing: true
        }
      ])
      assert.equal(wrapper.text(), "Loading")
    })

    it("multiple states with one processing:true", () => {
      const wrapper = renderLoading([
        {
          loaded:     false,
          processing: false
        },
        {
          loaded:     false,
          processing: true
        }
      ])
      assert.equal(wrapper.text(), "Loading")
    })
  })

  describe("should render errors correctly", () => {
    it("single state with error", () => {
      const wrapper = renderLoading([
        {
          loaded:     true,
          processing: false,
          error:      "bad things"
        }
      ])
      assert.equal(wrapper.text(), "Error loading page")
    })

    it("multiple states all with errors", () => {
      const wrapper = renderLoading([
        {
          loaded:     true,
          processing: false,
          error:      "bad things"
        },
        {
          loaded:     true,
          processing: false,
          error:      "bad things"
        }
      ])
      assert.equal(wrapper.text(), "Error loading page")
    })

    it("multiple states with one error", () => {
      const wrapper = renderLoading([
        {
          loaded:     true,
          processing: false,
          error:      undefined
        },
        {
          loaded:     true,
          processing: false,
          error:      "bad things"
        }
      ])
      assert.equal(wrapper.text(), "Error loading page")
    })
  })

  describe("should the contents if no errors", () => {
    it("single state", () => {
      const wrapper = renderLoading([
        {
          loaded:     true,
          processing: false,
          error:      undefined
        }
      ])
      assert.equal(wrapper.text(), "CONTENT")
    })

    it("multiple states", () => {
      const wrapper = renderLoading([
        {
          loaded:     true,
          processing: false,
          error:      undefined
        },
        {
          loaded:     true,
          processing: false,
          error:      undefined
        }
      ])
      assert.equal(wrapper.text(), "CONTENT")
    })
  })
})

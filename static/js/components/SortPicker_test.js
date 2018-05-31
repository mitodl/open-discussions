import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import R from "ramda"
import sinon from "sinon"

import { PostSortPicker, CommentSortPicker } from "./SortPicker"

import {
  VALID_POST_SORT_LABELS,
  VALID_COMMENT_SORT_LABELS
} from "../lib/sorting"

describe("PostSortPicker", () => {
  it("should have all the options we expect", () => {
    [
      [VALID_POST_SORT_LABELS, PostSortPicker],
      [VALID_COMMENT_SORT_LABELS, CommentSortPicker]
    ].forEach(([labels, Component]) => {
      const wrapper = shallow(<Component />)
      R.zip([...wrapper.find("option")], labels).forEach(
        ([optionWrapper, [postSortType, postSortLabel]]) => {
          const props = optionWrapper.props
          assert.equal(props.label, postSortLabel)
          assert.equal(props.value, postSortType)
          assert.equal(props.children, postSortLabel)
          assert.equal(optionWrapper.key, postSortType)
        }
      )
    })
  })

  it("should do what we want with the props we pass in", () => {
    [PostSortPicker, CommentSortPicker].forEach(Component => {
      const updateSortStub = sinon.stub()
      const wrapper = shallow(
        <Component updateSortParam={updateSortStub} value={"a great value"} />
      )
      assert.equal(wrapper.find("select").props().value, "a great value")
      wrapper
        .find("select")
        .props()
        .onChange()
      assert(updateSortStub.called)
    })
  })
})

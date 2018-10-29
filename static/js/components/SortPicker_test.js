// @flow
import { assert } from "chai"
import R from "ramda"
import sinon from "sinon"

import { PostSortPicker, CommentSortPicker } from "./SortPicker"

import {
  VALID_POST_SORT_LABELS,
  VALID_COMMENT_SORT_LABELS
} from "../lib/sorting"
import { configureShallowRenderer } from "../lib/test_utils"

describe("PostSortPicker", () => {
  let updateSortParamStub, renderComponent

  beforeEach(() => {
    updateSortParamStub = sinon.stub()
    renderComponent = Component =>
      configureShallowRenderer(Component, {
        updateSortParam: updateSortParamStub
      })
  })

  it("should have all the options we expect", () => {
    [
      [VALID_POST_SORT_LABELS, PostSortPicker],
      [VALID_COMMENT_SORT_LABELS, CommentSortPicker]
    ].forEach(([labels, Component]) => {
      const wrapper = renderComponent(Component)()
      // $FlowFixMe
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

  it("should display the label for the current value ", () => {
    [
      [PostSortPicker, VALID_POST_SORT_LABELS],
      [CommentSortPicker, VALID_COMMENT_SORT_LABELS]
    ].forEach(([Component, labels]) => {
      labels.forEach(([value, label]) => {
        const wrapper = renderComponent(Component)({ value })
        assert.include(wrapper.find(".current-sort").props().children, label)
      })
    })
  })

  it("should have an option for each option passed in", () => {
    [
      [PostSortPicker, VALID_POST_SORT_LABELS],
      [CommentSortPicker, VALID_COMMENT_SORT_LABELS]
    ].forEach(([Component, labels]) => {
      labels.forEach(([type, label], idx) => {
        updateSortParamStub = sinon.stub()
        const wrapper = configureShallowRenderer(Component, {
          updateSortParam: updateSortParamStub
        })()
        const menuItem = wrapper.find("MenuItem").at(idx)
        assert.equal(menuItem.props().children, label)
        menuItem.simulate("click")
        sinon.assert.calledWith(updateSortParamStub, type)
      })
    })
  })

  it("should open and close", () => {
    [PostSortPicker, CommentSortPicker].forEach(Component => {
      const wrapper = renderComponent(Component)()
      assert.isFalse(wrapper.find("Menu").props().open)
      assert.isFalse(wrapper.state("menuOpen"))
      wrapper.instance().toggleMenuOpen()
      wrapper.update()
      assert.isTrue(wrapper.find("Menu").props().open)
      assert.isTrue(wrapper.state("menuOpen"))
    })
  })

  it("sets the className", () => {
    [
      ["post-sort-picker", PostSortPicker],
      ["comment-sort-picker", CommentSortPicker]
    ].forEach(([cssClass, Component]) => {
      const wrapper = renderComponent(Component)()
      assert.equal(wrapper.prop("className"), `sorter ${cssClass}`)
    })
  })
})

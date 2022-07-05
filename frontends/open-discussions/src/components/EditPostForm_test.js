/* global SETTINGS:false */
import React from "react"
import R from "ramda"
import { Provider } from "react-redux"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"
import { EditorView } from "prosemirror-view"

import EditPostForm from "./EditPostForm"
import Editor from "./Editor"

import { beginEditing, editPostKey } from "./EditPostForm"
import { LINK_TYPE_ARTICLE } from "../lib/channels"
import * as forms from "../actions/forms"
import { actions } from "../actions"
import { makePost } from "../factories/posts"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("EditPostForm", () => {
  let helper, post, wrapper

  const renderEditPostForm = (props = {}) =>
    mount(
      <Provider store={helper.store}>
        <EditPostForm post={post} editing {...props} />
      </Provider>
    )

  const setEditorText = (wrapper, text) =>
    wrapper
      .find("Editor")
      .props()
      .onChange(text)

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    post = makePost()
    helper.getPostStub.returns(Promise.resolve(post))
    helper.store.dispatch(actions.posts.get(post.id))
    helper.sandbox.stub(EditorView.prototype, "focus")
    wrapper = renderEditPostForm()
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should use the ArticleEditor if an article post", () => {
    post.post_type = LINK_TYPE_ARTICLE
    wrapper = renderEditPostForm()
    assert.ok(wrapper.find("ArticleEditor").exists())
  })

  it("should use an Editor when a text post", () => {
    wrapper = renderEditPostForm()
    assert.ok(wrapper.find(Editor).exists())
  })

  it("should have the autofocus prop", () => {
    assert.isTrue(wrapper.find("Editor").props().autoFocus)
  })

  it("should trigger an update when text is input", async () => {
    const state = await helper.listenForActions([forms.FORM_UPDATE], () => {
      setEditorText(wrapper, "new post text")
    })
    assert.equal(R.keys(state.forms).length, 1)
    assert.deepInclude(state.forms[R.keys(state.forms)[0]], {
      value: { text: "new post text" }
    })
  })

  it("should cancel and go away", async () => {
    const mockPreventDefault = helper.sandbox.stub()
    const state = await helper.listenForActions([forms.FORM_END_EDIT], () => {
      wrapper.find(".cancel").simulate("click", {
        preventDefault: mockPreventDefault
      })
    })
    assert.deepEqual(state.forms, {})
    sinon.assert.calledWith(mockPreventDefault)
  })

  it("should submit the form and only submit the text field", async () => {
    const { requestType, successType } = actions.posts.patch
    helper.editPostStub.returns(Promise.resolve(post))

    beginEditing(helper.store.dispatch, editPostKey(post), post, undefined)

    await helper.listenForActions([forms.FORM_UPDATE], () => {
      setEditorText(wrapper, "edited text")
    })

    const state = await helper.listenForActions(
      [requestType, successType, forms.FORM_END_EDIT],
      () => {
        wrapper.find("form").simulate("submit")
      }
    )

    assert.deepEqual(state.forms, {})
    assert.deepEqual(helper.editPostStub.args[0], [
      post.id,
      { text: "edited text", id: post.id }
    ])
  })
})

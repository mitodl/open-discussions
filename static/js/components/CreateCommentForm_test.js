// @flow
import React from "react"
import R from "ramda"
import { Provider } from "react-redux"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"

import {
  ReplyToCommentForm,
  ReplyToPostForm,
  replyToPostKey
} from "./CreateCommentForm"

import * as forms from "../actions/forms"
import { actions } from "../actions"
import { SET_POST_DATA, setPostData } from "../actions/post"
import { makePost } from "../factories/posts"
import { makeComment } from "../factories/comments"
import IntegrationTestHelper from "../util/integration_test_helper"

import type { Comment, Post } from "../flow/discussionTypes"

describe("CreateCommentForm", () => {
  let helper, post, comment, postKeys, commentKeys

  const renderPostForm = (post: Post) =>
    mount(
      <Provider store={helper.store}>
        <ReplyToPostForm post={post} />
      </Provider>
    )

  const renderCommentForm = (comment: Comment) =>
    mount(
      <Provider store={helper.store}>
        <ReplyToCommentForm comment={comment} />
      </Provider>
    )

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    post = makePost()
    comment = makeComment(post)
    postKeys = {
      post_id: post.id,
      text:    "comment text"
    }
    commentKeys = {
      post_id:    post.id,
      comment_id: comment.id,
      text:       "comment text"
    }
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("ReplyToPostForm", () => {
    let expectedKeys, wrapper, emptyFormState

    beforeEach(() => {
      wrapper = renderPostForm(post)
      expectedKeys = postKeys
      emptyFormState = {
        errors: {},
        value:  {
          post_id: post.id,
          text:    ""
        }
      }
    })

    it("should not render a reply or cancel button", () => {
      assert.lengthOf(wrapper.find("a"), 0)
    })

    it("should begin form editing on load", async () => {
      wrapper = await renderPostForm(post)
      const [textarea] = wrapper.find("textarea[name='text']")
      assert.equal(textarea.value, "")
      assert.deepEqual(
        helper.store.getState().forms[replyToPostKey(post)],
        emptyFormState
      )
    })

    it("should trigger an update in state when text is input", async () => {
      let state = await helper.listenForActions([forms.FORM_UPDATE], () => {
        wrapper.find("textarea[name='text']").simulate("change", {
          target: {
            name:  "text",
            value: expectedKeys.text
          }
        })
      })
      assert.equal(R.keys(state.forms).length, 1)
      assert.deepInclude(state.forms[R.keys(state.forms)[0]], {
        value:  expectedKeys,
        errors: {}
      })
    })

    it("should submit the form", async () => {
      const { requestType, successType } = actions.comments.post
      helper.createCommentStub.returns(Promise.resolve(makeComment(post)))
      await helper.listenForActions([forms.FORM_UPDATE], () => {
        wrapper.find("textarea[name='text']").simulate("change", {
          target: {
            name:  "text",
            value: expectedKeys.text
          }
        })
      })

      let state = await helper.listenForActions(
        [
          requestType,
          successType,
          SET_POST_DATA,
          forms.FORM_END_EDIT,
          forms.FORM_BEGIN_EDIT
        ],
        () => {
          wrapper.find("form").simulate("submit")
        }
      )
      assert.deepEqual(state.forms[replyToPostKey(post)], emptyFormState)
      assert.equal(
        state.posts.data.get(post.id).num_comments,
        post.num_comments + 1
      )
      assert.isOk(
        helper.createCommentStub.calledWith(
          expectedKeys.post_id,
          expectedKeys.text,
          expectedKeys.comment_id || undefined
        )
      )
    })
  })

  describe("ReplyToCommentForm", () => {
    let expectedKeys, wrapper

    beforeEach(() => {
      (wrapper = renderCommentForm(comment)), (expectedKeys = commentKeys)
    })

    it("should render a reply button", () => {
      assert.equal(wrapper.find("a").text(), "Reply")
    })

    it("should show an empty form when reply is clicked", async () => {
      await helper.listenForActions([forms.FORM_BEGIN_EDIT], () => {
        wrapper.find("a").simulate("click")
      })
      const [textarea] = wrapper.find("textarea[name='text']")
      assert.equal(textarea.value, "")
    })

    it("should trigger an update in state when text is input", async () => {
      await helper.listenForActions([forms.FORM_BEGIN_EDIT], () => {
        wrapper.find("a").simulate("click")
      })
      const state = await helper.listenForActions([forms.FORM_UPDATE], () => {
        wrapper.find("textarea[name='text']").simulate("change", {
          target: {
            name:  "text",
            value: expectedKeys.text
          }
        })
      })
      assert.equal(R.keys(state.forms).length, 1)
      assert.deepInclude(state.forms[R.keys(state.forms)[0]], {
        value:  expectedKeys,
        errors: {}
      })
    })

    it("should cancel and hide the form", async () => {
      let mockPreventDefault = helper.sandbox.stub()
      await helper.listenForActions([forms.FORM_BEGIN_EDIT], () => {
        wrapper.find("a").simulate("click")
      })
      const state = await helper.listenForActions([forms.FORM_END_EDIT], () => {
        wrapper.find(".cancel-button").simulate("click", {
          preventDefault: mockPreventDefault
        })
      })
      assert.deepEqual(state.forms, {})
      assert.isNotOk(wrapper.find("textarea[name='text']").exists())
      sinon.assert.calledWith(mockPreventDefault)
    })

    it("should submit the form", async () => {
      const { requestType, successType } = actions.comments.post
      helper.createCommentStub.returns(Promise.resolve(makeComment(post)))
      await helper.listenForActions(
        [SET_POST_DATA, forms.FORM_BEGIN_EDIT],
        () => {
          helper.store.dispatch(setPostData(post))
          wrapper.find("a").simulate("click")
        }
      )
      await helper.listenForActions([forms.FORM_UPDATE], () => {
        wrapper.find("textarea[name='text']").simulate("change", {
          target: {
            name:  "text",
            value: expectedKeys.text
          }
        })
      })
      const state = await helper.listenForActions(
        [requestType, successType, SET_POST_DATA, forms.FORM_END_EDIT],
        () => {
          wrapper.find("form").simulate("submit")
        }
      )
      assert.deepEqual(state.forms, {})
      assert.equal(
        state.posts.data.get(post.id).num_comments,
        post.num_comments + 1
      )
      assert.isNotOk(wrapper.find("textarea[name='text']").exists())
      assert.isOk(
        helper.createCommentStub.calledWith(
          expectedKeys.post_id,
          expectedKeys.text,
          expectedKeys.comment_id || undefined
        )
      )
    })
  })
})

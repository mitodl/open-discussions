// @flow
import React from "react"
import R from "ramda"
import { Provider } from "react-redux"
import { assert } from "chai"
import { mount } from "enzyme"

import { ReplyToCommentForm, ReplyToPostForm } from "./CreateCommentForm"
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

  for (const [name, render, getExpectedKeys] of [
    ["ReplyToCommentForm", () => renderCommentForm(comment), () => commentKeys],
    ["ReplyToPostForm", () => renderPostForm(post), () => postKeys]
  ]) {
    describe(name, () => {
      let expectedKeys, wrapper
      beforeEach(() => {
        wrapper = render()
        expectedKeys = getExpectedKeys()
      })
      it("should render a reply button", () => {
        assert.equal(wrapper.find("a").text(), "Reply")
      })

      it("should show an empty form when reply is clicked", () => {
        return helper
          .listenForActions([forms.FORM_BEGIN_EDIT], () => {
            wrapper.find("a").simulate("click")
          })
          .then(() => {
            const [textarea] = wrapper.find("textarea[name='text']")
            assert.equal(textarea.value, "")
          })
      })

      it("should trigger an update in state when text is input", () => {
        return helper
          .listenForActions([forms.FORM_BEGIN_EDIT], () => {
            wrapper.find("a").simulate("click")
          })
          .then(() =>
            helper
              .listenForActions([forms.FORM_UPDATE], () => {
                wrapper.find("textarea[name='text']").simulate("change", {
                  target: {
                    name:  "text",
                    value: expectedKeys.text
                  }
                })
              })
              .then(state => {
                assert.equal(R.keys(state.forms).length, 1)
                assert.deepInclude(state.forms[R.keys(state.forms)[0]], {
                  value:  expectedKeys,
                  errors: {}
                })
              })
          )
      })

      it("should cancel and hide the form", () => {
        return helper
          .listenForActions([forms.FORM_BEGIN_EDIT], () => {
            wrapper.find("a").simulate("click")
          })
          .then(() =>
            helper
              .listenForActions([forms.FORM_END_EDIT], () => {
                wrapper.find(".cancel-button").simulate("click")
              })
              .then(state => {
                assert.deepEqual(state.forms, {})
                assert.isNotOk(wrapper.find("textarea[name='text']").exists())
              })
          )
      })

      it("should submit the form", () => {
        const { requestType, successType } = actions.comments.post
        helper.createCommentStub.returns(Promise.resolve(makeComment(post)))
        return helper
          .listenForActions([SET_POST_DATA, forms.FORM_BEGIN_EDIT], () => {
            helper.store.dispatch(setPostData(post))
            wrapper.find("a").simulate("click")
          })
          .then(() =>
            helper
              .listenForActions([forms.FORM_UPDATE], () => {
                wrapper.find("textarea[name='text']").simulate("change", {
                  target: {
                    name:  "text",
                    value: expectedKeys.text
                  }
                })
              })
              .then(() =>
                helper
                  .listenForActions([requestType, successType, SET_POST_DATA, forms.FORM_END_EDIT], () => {
                    wrapper.find("form").simulate("submit")
                  })
                  .then(state => {
                    assert.deepEqual(state.forms, {})
                    assert.equal(state.posts.data.get(post.id).num_comments, post.num_comments + 1)
                    assert.isNotOk(wrapper.find("textarea[name='text']").exists())
                    assert.isOk(
                      helper.createCommentStub.calledWith(
                        expectedKeys.post_id,
                        expectedKeys.text,
                        expectedKeys.comment_id || undefined
                      )
                    )
                  })
              )
          )
      })
    })
  }
})

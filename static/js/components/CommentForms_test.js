import React from "react"
import R from "ramda"
import { Provider } from "react-redux"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"
import { EditorView } from "prosemirror-view"

import {
  ReplyToCommentForm,
  ReplyToPostForm,
  EditCommentForm,
  EditPostForm,
  replyToPostKey,
  replyToCommentKey,
  editCommentKey,
  beginEditing,
  getCommentReplyInitialValue,
  editPostKey
} from "./CommentForms"
import Router from "../Router"
import LoginPopup from "./LoginPopup"

import * as forms from "../actions/forms"
import * as utilFuncs from "../lib/util"
import { actions } from "../actions"
import { CLEAR_COMMENT_ERROR } from "../actions/comment"
import { SET_POST_DATA, setPostData } from "../actions/post"
import { SET_BANNER_MESSAGE } from "../actions/ui"
import { makePost } from "../factories/posts"
import { makeComment } from "../factories/comments"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("CommentForms", () => {
  let helper, post, comment, postKeys, commentKeys

  const renderPostForm = (props = {}) =>
    mount(
      <Provider store={helper.store}>
        <Router store={helper.store} history={helper.browserHistory}>
          <ReplyToPostForm post={post} {...props} />
        </Router>
      </Provider>
    )

  const renderCommentForm = (props = {}) =>
    mount(
      <Provider store={helper.store}>
        <ReplyToCommentForm comment={comment} {...props} />
      </Provider>
    )

  const renderEditCommentForm = (props = {}) =>
    mount(
      <Provider store={helper.store}>
        <EditCommentForm comment={comment} editing {...props} />
      </Provider>
    )

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
    helper.sandbox.stub(EditorView.prototype, "focus")
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("ReplyToPostForm", () => {
    let expectedKeys, wrapper, emptyFormState

    beforeEach(() => {
      wrapper = renderPostForm()
      expectedKeys = postKeys
      emptyFormState = {
        errors: {},
        value:  {
          post_id: post.id,
          text:    ""
        }
      }
    })

    it("should disable submit button when passed empty comment", () => {
      assert.isTrue(wrapper.find("button").props().disabled)
    })

    it("should not have the autoFocus prop", () => {
      assert.isFalse(wrapper.find("textarea").props().autoFocus)
    })

    it("should enable submit button when text in form", async () => {
      await helper.listenForActions([forms.FORM_UPDATE], () => {
        wrapper.find("textarea[name='text']").simulate("change", {
          target: {
            name:  "text",
            value: expectedKeys.text
          }
        })
      })
      assert.isFalse(wrapper.find("button").props().disabled)
    })

    it("should not render a reply or cancel button", () => {
      assert.lengthOf(wrapper.find("a"), 0)
    })

    it("should begin form editing on load", async () => {
      wrapper = renderPostForm()
      // $FlowFixMe: Flow doesn't know that we can index into wrapper objects
      const [textarea] = wrapper.find("textarea[name='text']")
      assert.equal(textarea.props.value, "")
      assert.deepEqual(
        helper.store.getState().forms[replyToPostKey(post)],
        emptyFormState
      )
    })

    it("should trigger an update in state when text is input", async () => {
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

    it("should be enabled but display a login popup on click if user is anonymous", async () => {
      helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
      wrapper = renderPostForm()
      assert.isFalse(wrapper.find("button").props().disabled)
      wrapper.find("textarea").simulate("click")
      assert.isTrue(wrapper.find(LoginPopup).props().visible)
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

      const state = await helper.listenForActions(
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

    it("should disable button when we submit the form", async () => {
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

      await helper.listenForActions(
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
      assert.isTrue(wrapper.find("button").props().disabled)
    })

    it("should submit the form with ctrl-enter", async () => {
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

      await helper.listenForActions(
        [
          requestType,
          successType,
          SET_POST_DATA,
          forms.FORM_END_EDIT,
          forms.FORM_BEGIN_EDIT
        ],
        () => {
          wrapper
            .find("form")
            .simulate("keyDown", { ctrlKey: true, key: "Enter" })
        }
      )
      assert(helper.createCommentStub.calledOnce)
    })
  })

  describe("ReplyToCommentForm", () => {
    let expectedKeys, wrapper

    beforeEach(() => {
      wrapper = renderCommentForm()
      expectedKeys = commentKeys

      beginEditing(
        helper.store.dispatch,
        replyToCommentKey(comment),
        getCommentReplyInitialValue(comment),
        undefined
      )
      wrapper.update()
    })

    it("should have the autoFocus prop", () => {
      assert.isTrue(wrapper.find("textarea").props().autoFocus)
    })

    it("should disable submit button when passed empty comment", () => {
      assert.isTrue(wrapper.find("button").props().disabled)
    })

    it("should enable submit button when text in form", async () => {
      await helper.listenForActions([forms.FORM_UPDATE], () => {
        wrapper.find("textarea[name='text']").simulate("change", {
          target: {
            name:  "text",
            value: expectedKeys.text
          }
        })
      })
      wrapper = renderCommentForm()
      assert.isFalse(wrapper.find("button").props().disabled)
    })

    it("should show an empty form when reply has been started", async () => {
      // $FlowFixMe: Flow doesn't know that we can index into wrapper objects
      const [textarea] = wrapper.find("textarea[name='text']")
      assert.equal(textarea.props.value, "")
    })

    it("should trigger an update in state when text is input", async () => {
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
      const mockPreventDefault = helper.sandbox.stub()
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
      await helper.listenForActions([SET_POST_DATA], () => {
        helper.store.dispatch(setPostData(post))
      })
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
      wrapper.update()
      assert.isNotOk(wrapper.find("textarea[name='text']").exists())
      assert.isOk(
        helper.createCommentStub.calledWith(
          expectedKeys.post_id,
          expectedKeys.text,
          expectedKeys.comment_id || undefined
        )
      )
    })

    it("should disable submit button when the form is submitted", async () => {
      const { requestType } = actions.comments.post
      helper.createCommentStub.reset()
      // this is to ensure we can check the `disabled` prop before
      // the request resolves (which will set the prop back to false)
      helper.createCommentStub.callsFake(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(makeComment(post))
          }, 100)
        })
      })
      await helper.listenForActions([forms.FORM_UPDATE], () => {
        wrapper.find("textarea[name='text']").simulate("change", {
          target: {
            name:  "text",
            value: expectedKeys.text
          }
        })
      })
      await helper.listenForActions([requestType], () => {
        wrapper.find("form").simulate("submit")
      })
      const btnProps = wrapper.find("button").props()
      assert.isTrue(btnProps.disabled)
    })

    it("should submit the form with ctrl-enter", async () => {
      const { requestType } = actions.comments.post
      helper.createCommentStub.returns(Promise.resolve(makeComment(post)))
      await helper.listenForActions([forms.FORM_UPDATE], () => {
        wrapper.find("textarea[name='text']").simulate("change", {
          target: {
            name:  "text",
            value: expectedKeys.text
          }
        })
      })
      await helper.listenForActions([requestType], () => {
        wrapper
          .find("form")
          .simulate("keyDown", { ctrlKey: true, key: "Enter" })
      })
      assert(helper.createCommentStub.calledOnce)
    })

    it("should not submit on ctrl-enter when request is in flight", async () => {
      helper.createCommentStub.reset()
      // this is to ensure we can check that the key combo doesn't submit before
      // the request resolves (which will set the prop back to false)
      helper.createCommentStub.callsFake(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(makeComment(post))
          }, 100)
        })
      })
      await helper.listenForActions([forms.FORM_UPDATE], () => {
        wrapper.find("textarea[name='text']").simulate("change", {
          target: {
            name:  "text",
            value: expectedKeys.text
          }
        })
      })
      wrapper.find("form").simulate("keyDown", { ctrlKey: true, key: "Enter" })
      assert.isTrue(helper.createCommentStub.calledOnce)
    })

    it("should not submit on ctrl-enter when text is empty", () => {
      wrapper.find("form").simulate("keyDown", { ctrlKey: true, key: "Enter" })
      assert.isFalse(helper.createCommentStub.called)
    })
    ;[
      [410, "This comment has been deleted and cannot be replied to"],
      [500, "Something went wrong creating your comment"]
    ].forEach(([errorStatusCode, message]) => {
      it(`should display a toast message if ${errorStatusCode} error on form submit`, async () => {
        const { requestType, failureType } = actions.comments.post
        helper.createCommentStub.returns(Promise.reject({ errorStatusCode }))
        await helper.listenForActions([SET_POST_DATA], () => {
          helper.store.dispatch(setPostData(post))
        })
        await helper.listenForActions([forms.FORM_UPDATE], () => {
          wrapper.find("textarea[name='text']").simulate("change", {
            target: {
              name:  "text",
              value: expectedKeys.text
            }
          })
        })
        const state = await helper.listenForActions(
          [requestType, failureType, CLEAR_COMMENT_ERROR, SET_BANNER_MESSAGE],
          () => {
            wrapper.find("form").simulate("submit")
          }
        )
        assert.ok(state.ui.banner.message.startsWith(message))
        assert.equal(
          state.posts.data.get(post.id).num_comments,
          post.num_comments
        )
        assert.isOk(wrapper.find("textarea[name='text']").exists())
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

  describe("EditCommentForm", () => {
    let wrapper, expectedKeys

    beforeEach(() => {
      wrapper = renderEditCommentForm()
      expectedKeys = commentKeys
    })

    it("should have the autofocus prop", () => {
      assert.isTrue(wrapper.find("textarea").props().autoFocus)
    })

    it("should trigger an update when text is input", async () => {
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
        value: { text: "comment text" }
      })
    })

    it("should cancel and go away", async () => {
      const mockPreventDefault = helper.sandbox.stub()
      const state = await helper.listenForActions([forms.FORM_END_EDIT], () => {
        wrapper.find(".cancel-button").simulate("click", {
          preventDefault: mockPreventDefault
        })
      })
      assert.deepEqual(state.forms, {})
      sinon.assert.calledWith(mockPreventDefault)
    })

    it("should submit the form and only submit the text field", async () => {
      const { requestType, successType } = actions.comments.patch
      helper.updateCommentStub.returns(Promise.resolve(comment))

      beginEditing(
        helper.store.dispatch,
        editCommentKey(comment),
        comment,
        undefined
      )

      await helper.listenForActions([forms.FORM_UPDATE], () => {
        wrapper.find("textarea[name='text']").simulate("change", {
          target: {
            name:  "text",
            value: "edited text"
          }
        })
      })

      const state = await helper.listenForActions(
        [requestType, successType, forms.FORM_END_EDIT],
        () => {
          wrapper.find("form").simulate("submit")
        }
      )

      assert.deepEqual(state.forms, {})
      assert.deepEqual(helper.updateCommentStub.args[0], [
        comment.id,
        { text: "edited text", id: comment.id }
      ])
    })
  })

  describe("EditPostForm", () => {
    let wrapper

    beforeEach(() => {
      wrapper = renderEditPostForm()
    })

    it("should use the <Editor /> rather than a textarea", () => {
      assert.ok(wrapper.find("Editor").exists())
      assert.isNotOk(wrapper.find("textarea").exists())
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
        wrapper.find(".cancel-button").simulate("click", {
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
})

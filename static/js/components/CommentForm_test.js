// @flow
import React from "react"
import { Provider } from "react-redux"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"
import { Field } from "formik"

import CommentForm from "./CommentForm"
import LoginTooltip from "./LoginTooltip"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makePost } from "../factories/posts"
import { makeComment } from "../factories/comments"
import { makeProfile } from "../factories/profiles"

describe("CommentForm", () => {
  let helper, post, comment, profile, onSubmitActions, closeReplyStub

  const renderCommentForm = (props = {}) =>
    mount(
      <Provider store={helper.store}>
        <CommentForm post={post} comment={comment} {...props} />
      </Provider>
    )

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    post = makePost()
    comment = makeComment(post)
    profile = makeProfile()
    onSubmitActions = {
      setSubmitting: helper.sandbox.stub(),
      resetForm:     helper.sandbox.stub()
    }
    closeReplyStub = helper.sandbox.stub()
    helper.createCommentStub.returns(Promise.resolve())
    helper.updateCommentStub.returns(Promise.resolve())
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should include a LoginTooltip", () => {
    const wrapper = renderCommentForm()
    assert.isOk(wrapper.find(LoginTooltip).exists())
  })

  it("should pass the initial text to formik if passed the editing flag", () => {
    const wrapper = renderCommentForm({
      comment,
      editing: true
    })
    assert.equal(
      comment.text,
      wrapper.find("Formik").prop("initialValues").commentText
    )
  })

  it("should include a profile image component if passed a profile", () => {
    const wrapper = renderCommentForm({ profile })
    assert.ok(wrapper.find("ProfileImage").exists())
  })

  it("should pass down the autofocus prop to the <Field />", () => {
    [true, false].forEach(autoFocus => {
      const wrapper = renderCommentForm({ autoFocus })
      assert.equal(wrapper.find(Field).prop("autoFocus"), autoFocus)
    })
  })

  it("should create a comment with the right arguments onSubmit", async () => {
    const wrapper = renderCommentForm()

    await wrapper.find("Formik").prop("onSubmit")(
      { commentText: "hey!" },
      onSubmitActions
    )
    sinon.assert.calledWith(onSubmitActions.resetForm, { commentText: "" })
    sinon.assert.calledWith(onSubmitActions.setSubmitting, false)
    sinon.assert.calledWith(
      helper.createCommentStub,
      post.id,
      "hey!",
      comment.id
    )
  })

  it("should patch the comment if passed the editing flag", async () => {
    const wrapper = renderCommentForm({ editing: true })
    await wrapper.find("Formik").prop("onSubmit")(
      { commentText: "hey!" },
      onSubmitActions
    )
    sinon.assert.calledWith(onSubmitActions.resetForm, { commentText: "" })
    sinon.assert.calledWith(onSubmitActions.setSubmitting, false)
    sinon.assert.calledWith(helper.updateCommentStub, comment.id, {
      id:   comment.id,
      text: "hey!"
    })
  })

  it("should call closeReply on submit, if passed", async () => {
    const wrapper = renderCommentForm({ closeReply: closeReplyStub })
    await wrapper.find("Formik").prop("onSubmit")(
      { commentText: "asdfasdfasdf" },
      onSubmitActions
    )
    sinon.assert.called(closeReplyStub)
    sinon.assert.notCalled(onSubmitActions.resetForm)
  })

  it("should render a cancel button with closeReply, if passed", () => {
    const wrapper = renderCommentForm({ closeReply: closeReplyStub })
    wrapper.find(".cancel").simulate("click")
    sinon.assert.called(closeReplyStub)
  })

  it("should not render cancel button, if not passed closeReply", () => {
    assert.isNotOk(
      renderCommentForm()
        .find(".cancel")
        .exists()
    )
  })
})

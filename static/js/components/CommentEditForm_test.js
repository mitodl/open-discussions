// @flow
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import CommentEditForm from "./CommentEditForm"
import { makePost } from "../factories/posts"

import type { CommentEditable, Post } from "../flow/discussionTypes"
//
// describe("ChannelEditForm", () => {
//   const renderForm = (
//     comment: CommentEditable,
//     post: Post,
//     { onSubmit, onUpdate } = { onSubmit: () => {}, onUpdate: () => {}}) => shallow(
//     <CommentEditForm
//       post={post}
//       comment={comment}
//       onSubmit={onSubmit}
//       onUpdate={onUpdate}
//     />
//   )
//   const comment = {
//     post_id: "1",
//     text:    "text",
//   }
//   const post = makePost()
//   let sandbox
//
//   beforeEach(() => {
//     sandbox = sinon.sandbox.create()
//   })
//
//   afterEach(() => {
//     sandbox.restore()
//   })
//
//   it("should render a blank form", () => {
//     let wrapper = renderForm(comment, post)
//     let [description] = wrapper.find("textarea")
//     assert.equal(description.props.value, "text")
//   })
//
//   describe("callbacks", () => {
//     let wrapper, onSubmit, onUpdate
//     beforeEach(() => {
//       [onSubmit, onUpdate] = [sandbox.stub(), sandbox.stub()]
//       wrapper = renderForm(comment, { onSubmit, onUpdate })
//     })
//
//     describe("onSubmit", () => {
//       it("should be called when form is submitted", () => {
//         assert.isNotOk(onSubmit.called)
//         wrapper.find("form").simulate("submit")
//         assert.isOk(onSubmit.called)
//         assert.isNotOk(onUpdate.called)
//       })
//     })
//
//     describe("onUpdate", () => {
//       it('should be called when text input is modified', () => {
//         let event = { target: { value: "text" }}
//         assert.isNotOk(onSubmit.called)
//         wrapper.find("[name='text']").simulate("change", event)
//         assert.isOk(onUpdate.calledWith(event))
//       })
//     })
//   })
//
// })

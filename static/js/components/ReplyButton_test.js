// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"

import ReplyButton from "./ReplyButton"
import LoginPopup from "./LoginPopup"
import Router from "../Router"
import IntegrationTestHelper from "../util/integration_test_helper"
import { getCommentReplyInitialValue, replyToCommentKey } from "./CommentForms"
import { makeComment } from "../factories/comments"
import { makePost } from "../factories/posts"
import { shouldIf } from "../lib/test_utils"
import * as utilFuncs from "../lib/util"

describe("ReplyButton", () => {
  let helper, beginEditingStub, comment

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    beginEditingStub = helper.sandbox.stub()
    comment = makeComment(makePost())
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderButton = () =>
    mount(
      <Router store={helper.store} history={helper.browserHistory}>
        <ReplyButton
          formKey={replyToCommentKey(comment)}
          initialValue={getCommentReplyInitialValue(comment)}
          beginEditing={beginEditingStub}
        />
      </Router>
    )

  it("should have a LoginPopup, if the user is anonymous", () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    const wrapper = renderButton()
    wrapper.find(LoginPopup).exists()
  })

  it("should not have a LoginPopup, if the user is not anonymous", () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)
    assert.isNotOk(
      renderButton()
        .find(LoginPopup)
        .exists()
    )
  })

  //
  ;[true, false].forEach(isAnonymous => {
    it(`clicking the follow button ${shouldIf(
      isAnonymous
    )} set visible state to true and ${shouldIf(
      !isAnonymous
    )} trigger beginEditing function`, () => {
      helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(isAnonymous)
      const wrapper = renderButton()
      wrapper.find(".reply-button").simulate("click")
      if (isAnonymous) {
        assert.equal(wrapper.find(LoginPopup).props().visible, isAnonymous)
      }
      assert.equal(
        beginEditingStub.calledWith(
          replyToCommentKey(comment),
          getCommentReplyInitialValue(comment)
        ),
        !isAnonymous
      )
    })
  })
})

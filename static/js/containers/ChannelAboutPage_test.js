// @flow
/* global SETTINGS */
import { assert } from "chai"
import sinon from "sinon"

import ChannelAboutPage, {
  ChannelAboutPage as InnerChannelAboutPage
} from "./ChannelAboutPage"

import * as ArticleEditorModule from "../components/ArticleEditor"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannel } from "../factories/channels"
import { shouldIf } from "../lib/test_utils"
import { actions } from "../actions"
import { editChannelForm, EDIT_CHANNEL_KEY } from "../lib/channels"

describe("ChannelAboutPage", () => {
  let helper, render, channel

  beforeEach(() => {
    channel = makeChannel()
    helper = new IntegrationTestHelper()
    helper.updateChannelStub.returns(Promise.resolve())
    render = helper.configureHOCRenderer(
      ChannelAboutPage,
      InnerChannelAboutPage,
      {
        forms: {}
      },
      { channel }
    )
    helper.stubComponent(ArticleEditorModule, "ArticleEditor")
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render about content, if present", async () => {
    channel.about = []
    const { inner } = await render()
    const { readOnly, initialData } = inner.find("ArticleEditor").props()
    assert.isTrue(readOnly)
    assert.deepEqual(initialData, channel.about)
  })

  //
  ;[true, false].forEach(userIsModerator => {
    it(`${shouldIf(
      userIsModerator
    )} render editing UI if user is moderator`, async () => {
      channel.user_is_moderator = userIsModerator
      const { inner } = await render()
      assert.equal(userIsModerator, inner.find(".edit-button").exists())
    })
  })

  it("should call beginChannelFormEdit when user clicks edit", async () => {
    channel.user_is_moderator = true
    const { inner, store } = await render()
    inner.find(".edit-button").simulate("click")
    const { type, payload } = store.getLastAction()
    assert.equal(type, actions.forms.FORM_BEGIN_EDIT)
    assert.equal(payload.formKey, EDIT_CHANNEL_KEY)
    assert.deepEqual(payload.value, editChannelForm(channel))
  })

  it("should render an editing UI when there is a form present", async () => {
    channel.user_is_moderator = true
    const patchStub = helper.sandbox.stub()
    const { inner, store } = await render(
      {
        forms: {
          [EDIT_CHANNEL_KEY]: { value: { field: "Value" } }
        }
      },
      { patchChannel: patchStub }
    )
    const { onChange } = inner.find("ArticleEditor").props()
    onChange("wowowowow")
    const { type, payload } = store.getLastAction()
    assert.equal(type, actions.forms.FORM_UPDATE)
    assert.deepEqual(payload.value, { about: "wowowowow" })
    const { onClick } = inner.find(".save-button").props()
    onClick()
    sinon.assert.called(helper.updateChannelStub)
  })
})

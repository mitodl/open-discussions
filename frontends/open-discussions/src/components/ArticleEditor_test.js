/* global SETTINGS: false */
// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import ArticleEditor from "./ArticleEditor"

import { wait } from "../lib/util"
import { getCKEditorJWT } from "../lib/api/ckeditor"
import * as embedUtil from "../lib/embed"

describe("ArticleEditor", () => {
  let sandbox, fetchStub, embedlyPlatformStub

  beforeEach(() => {
    SETTINGS.ckeditor_upload_url = "/upload/token"
    sandbox = sinon.createSandbox()
    fetchStub = sandbox.stub(fetchFuncs, "fetchWithCSRF")
    embedlyPlatformStub = sandbox.stub(embedUtil, "loadEmbedlyPlatform")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should load the editor and fetch the auth token", async () => {
    const wrapper = mount(<ArticleEditor initialData={[]} />)
    await wait(100)
    sinon.assert.calledWith(fetchStub, "/api/v0/ckeditor/")
    assert.isFalse(wrapper.instance().editor.isReadOnly)
    assert.deepEqual(wrapper.instance().editor.config._config.cloudServices, {
      uploadUrl: SETTINGS.ckeditor_upload_url,
      tokenUrl:  getCKEditorJWT
    })
  })

  it("should load the embedly platform", () => {
    mount(<ArticleEditor initialData={[]} />)
    sinon.assert.called(embedlyPlatformStub)
  })

  it("should set the readOnly property, if passed", async () => {
    const wrapper = mount(<ArticleEditor readOnly initialData={[]} />)
    await wait(100)
    assert.isTrue(wrapper.instance().editor.isReadOnly)
  })
})

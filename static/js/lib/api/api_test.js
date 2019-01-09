/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import qs from "query-string"
import { PATCH, POST, DELETE } from "redux-hammock/constants"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"
import R from "ramda"

import {
  getComments,
  getComment,
  createComment,
  updateComment,
  getMoreComments,
  deleteComment,
  getSettings,
  patchFrontpageSetting,
  patchCommentSetting,
  getProfile,
  patchProfileImage,
  updateProfile,
  postEmailLogin,
  postPasswordLogin,
  postEmailRegister,
  postConfirmRegister,
  postDetailsRegister,
  postPasswordResetEmail,
  postPasswordResetNewPassword,
  postSetPassword,
  search,
  getWidgetList,
  patchWidgetList
} from "./api"
import { makePost } from "../../factories/posts"
import {
  makeCommentsResponse,
  makeMoreCommentsResponse
} from "../../factories/comments"
import { COMMENT_SORT_NEW } from "../picker"
import * as authFuncs from "./fetch_auth"
import * as searchFuncs from "../search"
import { makeProfile } from "../../factories/profiles"
import { makeWidgetListResponse } from "../../factories/widgets"

describe("api", function() {
  this.timeout(5000) // eslint-disable-line no-invalid-this

  let sandbox
  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(function() {
    sandbox.restore()

    for (const cookie of document.cookie.split(";")) {
      const key = cookie.split("=")[0].trim()
      document.cookie = `${key}=`
    }
  })

  describe("REST functions", () => {
    let fetchJSONStub, fetchStub
    beforeEach(() => {
      fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
      fetchStub = sandbox.stub(fetchFuncs, "fetchWithCSRF")
    })

    describe("getComments", () => {
      let post, response

      beforeEach(() => {
        post = makePost()
        response = makeCommentsResponse(post)
        fetchJSONStub.returns(Promise.resolve(response))
      })

      it("gets comments for a post", async () => {
        const resp = await getComments(post.id, {})
        assert.deepEqual(resp, response)
      })

      it("includes the sort parameter when getting comments", async () => {
        const resp = await getComments(post.id, { sort: COMMENT_SORT_NEW })
        assert.deepEqual(resp, response)
        assert.ok(
          fetchJSONStub.calledWith(
            `/api/v0/posts/${post.id}/comments/?sort=new`
          )
        )
      })
    })

    it("gets a single comment", async () => {
      const post = makePost()
      const response = R.slice(0, 1, makeCommentsResponse(post))
      fetchJSONStub.returns(response)

      const resp = await getComment(post.id)
      assert.deepEqual(resp, response)
    })

    it("creates comments for a post", async () => {
      const post = makePost()
      fetchJSONStub.returns(Promise.resolve())

      await createComment(post.id, "my new comment")
      assert.ok(fetchJSONStub.calledWith(`/api/v0/posts/${post.id}/comments/`))
      assert.deepEqual(fetchJSONStub.args[0][1], {
        method: POST,
        body:   JSON.stringify({ text: "my new comment" })
      })
    })

    it("creates comments replying to comments", async () => {
      const post = makePost()
      const tree = makeCommentsResponse(post)
      fetchJSONStub.returns(Promise.resolve())

      await createComment(post.id, "my new comment", tree[0].id)
      assert.ok(fetchJSONStub.calledWith(`/api/v0/posts/${post.id}/comments/`))
      assert.deepEqual(fetchJSONStub.args[0][1], {
        method: POST,
        body:   JSON.stringify({
          text:       "my new comment",
          comment_id: tree[0].id
        })
      })
    })

    it("updates a comment", async () => {
      const post = makePost()
      const tree = makeCommentsResponse(post)
      const comment = tree[0]
      const commentResponse = { ...comment, replies: undefined, text: "edited" }

      fetchJSONStub.returns(Promise.resolve(commentResponse))

      const payload = {
        text:      "edited",
        downvoted: true
      }
      const updated = await updateComment(comment.id, payload)
      assert.ok(fetchJSONStub.calledWith(`/api/v0/comments/${comment.id}/`))
      assert.deepEqual(updated, commentResponse)
      assert.deepEqual(fetchJSONStub.args[0][1], {
        method: PATCH,
        body:   JSON.stringify(payload)
      })
    })

    it("deletes a comment", async () => {
      const comment = makeCommentsResponse(makePost())[0]
      fetchStub.returns(Promise.resolve())

      await deleteComment(comment.id)
      assert.ok(
        fetchStub.calledWith(`/api/v0/comments/${comment.id}/`, {
          method: DELETE
        })
      )
    })

    it("gets profile", async () => {
      const username = "username"
      const profile = makeProfile(username)
      fetchJSONStub.returns(Promise.resolve(profile))
      const result = await getProfile(username)
      assert.ok(fetchJSONStub.calledWith(`/api/v0/profiles/${username}/`))
      assert.deepEqual(result, profile)
    })

    it("updates a profile", async () => {
      const profile = makeProfile()
      profile.headline = "updated!"
      fetchJSONStub.returns(Promise.resolve(profile))
      await updateProfile(profile.username, profile)
      assert.ok(
        fetchJSONStub.calledWith(`/api/v0/profiles/${profile.username}/`)
      )
      assert.deepEqual(fetchJSONStub.args[0][1], {
        method: PATCH,
        body:   JSON.stringify(profile)
      })
    })

    describe("updates profile image", () => {
      const imageName = "a file name"
      const userName = "jane"
      const checkArgs = () => {
        const [url, obj] = fetchStub.args[0]
        assert.equal(url, `/api/v0/profiles/${userName}/`)
        assert.equal(obj.method, "PATCH")
        const img = obj.body.get("image_file")
        assert.equal(img.name, imageName)
      }

      it("successfully updates a user profile image", () => {
        const blob = new Blob()
        const formData = new FormData()
        formData.append("image", blob, imageName)
        fetchStub.returns(Promise.resolve("good response"))
        return patchProfileImage(userName, blob, imageName).then(res => {
          assert.equal(res, "good response")
          checkArgs()
        })
      })

      it("fails to update a user profile image", () => {
        const blob = new Blob()
        fetchStub.returns(Promise.reject())
        return assert
          .isRejected(patchProfileImage(userName, blob, imageName))
          .then(() => {
            checkArgs()
          })
      })
    })

    describe("retrieves more comments", () => {
      it("at the root level", async () => {
        const post = makePost()
        const moreComments = makeMoreCommentsResponse(post)
        const children = ["some", "child", "ren"]

        fetchJSONStub.returns(Promise.resolve(moreComments))

        const response = await getMoreComments(post.id, null, children)
        const payload = {
          post_id:  post.id,
          children: children
        }
        assert.ok(
          fetchJSONStub.calledWith(
            `/api/v0/morecomments/?${qs.stringify(payload)}`
          )
        )
        assert.deepEqual(response, moreComments)
      })

      it("replying to a parent", async () => {
        const post = makePost()
        const commentsResponse = makeCommentsResponse(post)
        const parent = commentsResponse[0]
        const moreComments = makeMoreCommentsResponse(post, parent.id)
        const children = ["some", "child", "ren"]

        fetchJSONStub.returns(Promise.resolve(moreComments))

        const response = await getMoreComments(post.id, parent.id, children)
        const payload = {
          post_id:   post.id,
          parent_id: parent.id,
          children:  children
        }
        assert.ok(
          fetchJSONStub.calledWith(
            `/api/v0/morecomments/?${qs.stringify(payload)}`
          )
        )
        assert.deepEqual(response, moreComments)
      })
    })

    describe("postEmailLogin", () => {
      it("should pass email", async () => {
        const flow = "register"
        const email = "test@example.com"
        await postEmailLogin(flow, email)
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/login/email/", {
            method: POST,
            body:   JSON.stringify({ flow, email })
          })
        )
      })
    })

    describe("postPasswordLogin", () => {
      it("should pass password and partial_token", async () => {
        const flow = "register"
        const password = "abc123"
        const partialToken = "def456"
        await postPasswordLogin(flow, partialToken, password)
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/login/password/", {
            method: POST,
            body:   JSON.stringify({
              flow,
              partial_token: partialToken,
              password
            })
          })
        )
      })
    })

    describe("postEmailRegister", () => {
      it("should pass email", async () => {
        const flow = "register"
        const email = "test@example.com"
        await postEmailRegister(flow, email)
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/register/email/", {
            method: POST,
            body:   JSON.stringify({ flow, email })
          })
        )
      })
    })

    describe("postConfirmRegister", () => {
      it("should pass code", async () => {
        const flow = "register"
        const code = "123456"
        const token = "abcdef"
        await postConfirmRegister(flow, token, code)
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/register/confirm/", {
            method: POST,
            body:   JSON.stringify({
              flow,
              partial_token:     token,
              verification_code: code
            })
          })
        )
      })
    })

    describe("postDetailsRegister", () => {
      it("should pass name, password, and partial_token", async () => {
        const flow = "register"
        const partialToken = "def456"
        const name = "sally"
        const password = "abc123"
        await postDetailsRegister(flow, partialToken, name, password)
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/register/details/", {
            method: POST,
            body:   JSON.stringify({
              flow,
              partial_token: partialToken,
              name,
              password
            })
          })
        )
      })
    })

    describe("postPasswordResetEmail", () => {
      it("should pass email", async () => {
        const email = "test@example.com"
        await postPasswordResetEmail(email)
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/password_reset/", {
            method: POST,
            body:   JSON.stringify({ email })
          })
        )
      })
    })

    describe("postPasswordResetNewPassword", () => {
      it("should pass password with confirmation, token, and uid", async () => {
        const newPassword = "abcdefgh"
        const reNewPassword = "abcdefgh"
        const token = "4xe-88789b25f477a553b150"
        const uid = "AA"
        await postPasswordResetNewPassword(
          newPassword,
          reNewPassword,
          token,
          uid
        )
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/password_reset/confirm/", {
            method: POST,
            body:   JSON.stringify({
              new_password:    newPassword,
              re_new_password: reNewPassword,
              token,
              uid
            })
          })
        )
      })
    })

    describe("postSetPassword", () => {
      it("should pass a current and new password", async () => {
        const currentPassword = "abcdefgh"
        const newPassword = "abcdefgh"
        await postSetPassword(currentPassword, newPassword)
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/set_password/", {
            method: POST,
            body:   JSON.stringify({
              current_password: currentPassword,
              new_password:     newPassword
            })
          })
        )
      })
    })

    describe("search", () => {
      it("should execute a search and return results", async () => {
        const body = { a: "body" }
        const buildStub = sandbox
          .stub(searchFuncs, "buildSearchQuery")
          .returns(body)
        const params = { some: "params" }
        await search(params)
        sinon.assert.calledWith(buildStub, params)
        sinon.assert.calledWith(fetchJSONStub, "/api/v0/search/", {
          method: POST,
          body:   JSON.stringify(body)
        })
      })
    })

    describe("widget functions", () => {
      it("fetches a widget list", async () => {
        const widgetList = makeWidgetListResponse()
        fetchJSONStub.returns(Promise.resolve(widgetList))
        const widgetListId = widgetList.id
        const response = await getWidgetList(widgetListId)
        assert.deepEqual(response, widgetList)
        sinon.assert.calledWith(
          fetchJSONStub,
          `/api/v0/widget_lists/${widgetListId}/`
        )
      })

      it("patches a widget list", async () => {
        const widgetList = makeWidgetListResponse()
        fetchJSONStub.returns(Promise.resolve(widgetList))
        const widgetListId = widgetList.id
        const args = { some: "args" }
        const response = await patchWidgetList(widgetListId, args)
        assert.deepEqual(response, widgetList)
        sinon.assert.calledWith(
          fetchJSONStub,
          `/api/v0/widget_lists/${widgetListId}/`,
          {
            method: "PATCH",
            body:   JSON.stringify(args)
          }
        )
      })
    })
  })

  describe("settings functions", () => {
    let fetchTokenStub, fetchAuthFailureStub
    const setting = { settings: "are great" }

    beforeEach(() => {
      fetchTokenStub = sandbox.stub(authFuncs, "fetchJSONWithToken")
      fetchAuthFailureStub = sandbox.stub(authFuncs, "fetchJSONWithAuthFailure")
      fetchTokenStub.returns(Promise.resolve())
      fetchAuthFailureStub.returns(Promise.resolve())
    })

    describe("getSettings", () => {
      it("calls fetchJSONWithToken when passed a token", async () => {
        await getSettings("mygreattoken")
        assert.isNotOk(fetchAuthFailureStub.called)
        assert.ok(
          fetchTokenStub.calledWith(
            "/api/v0/notification_settings/",
            "mygreattoken"
          )
        )
      })

      it("calls fetchJSONWithAuthFailure when not passed a token", async () => {
        await getSettings()
        assert.isNotOk(fetchTokenStub.called)
        assert.ok(
          fetchAuthFailureStub.calledWith("/api/v0/notification_settings/")
        )
      })
    })

    describe("patchFrontpageSetting", () => {
      it("should call fetchJSONWithToken when passed a token", async () => {
        await patchFrontpageSetting(setting, "great token")
        assert.isNotOk(fetchAuthFailureStub.called)
        assert.ok(
          fetchTokenStub.calledWith(
            "/api/v0/notification_settings/frontpage/",
            "great token",
            {
              method: PATCH,
              body:   JSON.stringify(setting)
            }
          )
        )
      })

      it("calls fetchJSONWithAuthFailure when not passed a token", async () => {
        await patchFrontpageSetting(setting)
        assert.isNotOk(fetchTokenStub.called)
        assert.ok(
          fetchAuthFailureStub.calledWith(
            "/api/v0/notification_settings/frontpage/",
            {
              method: PATCH,
              body:   JSON.stringify(setting)
            }
          )
        )
      })
    })

    describe("patchCommentSetting", () => {
      it("should call fetchJSONWithToken when passed a token", async () => {
        await patchCommentSetting(setting, "great token")
        assert.isNotOk(fetchAuthFailureStub.called)
        assert.ok(
          fetchTokenStub.calledWith(
            "/api/v0/notification_settings/comments/",
            "great token",
            {
              method: PATCH,
              body:   JSON.stringify(setting)
            }
          )
        )
      })

      it("calls fetchJSONWithAuthFailure when not passed a token", async () => {
        await patchCommentSetting(setting)
        assert.isNotOk(fetchTokenStub.called)
        assert.ok(
          fetchAuthFailureStub.calledWith(
            "/api/v0/notification_settings/comments/",
            {
              method: PATCH,
              body:   JSON.stringify(setting)
            }
          )
        )
      })
    })
  })
})

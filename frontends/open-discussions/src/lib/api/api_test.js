/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import { PATCH, POST } from "redux-hammock/constants"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import {
  getUserPosts,
  getUserComments,
  getSettings,
  patchFrontpageSetting,
  patchCommentSetting,
  patchModeratorSetting,
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
  getRelatedPosts
} from "./api"
import { makePost, makeChannelPostList } from "../../factories/posts"
import { makeCommentsResponse } from "../../factories/comments"
import * as authFuncs from "./fetch_auth"
import { makeProfile } from "../../factories/profiles"

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

    it("gets user posts", async () => {
      const posts = makeChannelPostList()
      fetchJSONStub.returns(Promise.resolve({ posts }))

      const result = await getUserPosts("someuser", {
        before: "abc",
        after:  "def",
        count:  5
      })
      assert.ok(
        fetchJSONStub.calledWith(
          `/api/v0/profiles/someuser/posts/?after=def&before=abc&count=5`
        )
      )
      assert.deepEqual(result.posts, posts)
    })

    it("gets user comment", async () => {
      const comments = makeCommentsResponse(makePost())
      fetchJSONStub.returns(Promise.resolve({ comments }))

      const result = await getUserComments("someuser", {
        before: "abc",
        after:  "def",
        count:  5
      })
      assert.ok(
        fetchJSONStub.calledWith(
          `/api/v0/profiles/someuser/comments/?after=def&before=abc&count=5`
        )
      )
      assert.deepEqual(result.comments, comments)
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

        const courseSearchUtils = require("@mitodl/course-search-utils/dist/search")
        const buildStub = sinon
          .stub(courseSearchUtils, "buildSearchQuery")
          .returns(body)
        const params = {
          text:   "text",
          type:   "course",
          facets: new Map([["offered_by", "OCW"]])
        }
        const standardizedParams = {
          text:         "text",
          activeFacets: {
            offered_by: "OCW",
            type:       "course"
          }
        }

        await search(params)
        sinon.assert.calledWith(buildStub, standardizedParams)
        sinon.assert.calledWith(fetchJSONStub, "/api/v0/search/", {
          method: POST,
          body:   JSON.stringify(body)
        })
      })
    })

    describe("getRelatedPosts", () => {
      it("should execute a more-like-this search and return results", async () => {
        const postId = "abc"
        await getRelatedPosts(postId)
        sinon.assert.calledWith(fetchJSONStub, `/api/v0/related/${postId}/`, {
          method: POST
        })
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

    describe("patchModeratorSetting", () => {
      it("should call fetchJSONWithToken when passed a token", async () => {
        await patchModeratorSetting(setting, "great token")
        assert.isNotOk(fetchAuthFailureStub.called)
        assert.ok(
          fetchTokenStub.calledWith(
            "/api/v0/notification_settings/moderator_posts/",
            "great token",
            {
              method: PATCH,
              body:   JSON.stringify(setting)
            }
          )
        )
      })

      it("calls fetchJSONWithAuthFailure when not passed a token", async () => {
        await patchModeratorSetting(setting)
        assert.isNotOk(fetchTokenStub.called)
        assert.ok(
          fetchAuthFailureStub.calledWith(
            "/api/v0/notification_settings/moderator_posts/",
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

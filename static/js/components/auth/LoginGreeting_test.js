// @flow
/* global SETTINGS:false */
import React from "react"
import R from "ramda"
import { mount } from "enzyme"
import { assert } from "chai"

import LoginGreeting from "./LoginGreeting"

describe("LoginGreeting", () => {
  [
    ["Testuser", "x.jpg", "a@b.com", "exists"],
    [undefined, undefined, "a@b.com", "does not exist"]
  ].forEach(([name, profileImageUrl, email, descriptor]) => {
    it(`should render the page with correct messages when user data ${descriptor}`, async () => {
      const expectedProfileInfo = R.none(R.isNil, [name, profileImageUrl])
      const expectedGreeting = expectedProfileInfo
        ? `Hi ${String(name)}`
        : "Welcome Back!"

      const wrapper = mount(
        <LoginGreeting
          name={name}
          profileImageUrl={profileImageUrl}
          email={email}
        />
      )

      assert.equal(wrapper.find("h3").text(), expectedGreeting)
      const profileInfoSection = wrapper.find(".profile-image-email")
      assert.equal(profileInfoSection.exists(), expectedProfileInfo)
      if (expectedProfileInfo) {
        assert.equal(
          profileInfoSection.find("img").prop("src"),
          profileImageUrl
        )
        assert.equal(profileInfoSection.find("span").text(), email)
      }
    })
  })
})

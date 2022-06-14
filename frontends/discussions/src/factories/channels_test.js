// @flow
import { assert } from "chai"

import {
  makeChannel,
  makeModerators,
  makeContributors,
  makeChannelInvite
} from "./channels"

describe("channels related factories", () => {
  it("should make a channel", () => {
    const channel = makeChannel()
    assert.isString(channel.name)
    assert.isString(channel.title)
    assert.equal(channel.channel_type, "public")
    assert.isString(channel.public_description)
    assert.isNumber(channel.num_users)
  })

  //
  ;[true, false].forEach(specifyUsername => {
    [true, false].forEach(isModerator => {
      it(`should make a moderators list as a ${
        isModerator ? "moderator" : "regular user"
      } ${specifyUsername ? "with a special username" : ""}`, () => {
        const moderators = makeModerators(
          specifyUsername ? "username" : null,
          isModerator
        )
        if (specifyUsername) {
          assert.equal(moderators[0].moderator_name, "username")
        }
        assert.deepEqual(moderators.length, 3)
        for (const moderator of moderators) {
          assert.ok(moderator.moderator_name)
          assert.equal(!!moderator.full_name, isModerator)
          assert.equal(!!moderator.email, isModerator)
        }
      })
    })
  })

  //
  ;[true, false].forEach(specifyUsername => {
    it(`should make a contributors list ${
      specifyUsername ? "with a special username" : ""
    }`, () => {
      const contributors = makeContributors(specifyUsername ? "username" : null)
      if (specifyUsername) {
        assert.equal(contributors[0].contributor_name, "username")
      }
      assert.deepEqual(contributors.length, 3)
      for (const contributor of contributors) {
        assert.ok(contributor.contributor_name)
        assert.ok(contributor.full_name)
        assert.ok(contributor.email)
      }
    })
  })

  //
  ;[true, false].forEach(specifyEmail => {
    it(`should make a channel invitation ${
      specifyEmail ? "with a specific email" : ""
    }`, () => {
      const invite = makeChannelInvite(specifyEmail ? "username" : null)
      if (specifyEmail) {
        assert.equal(invite.email, "username")
      }
      assert.ok(invite.id)
      assert.ok(invite.created_on)
      assert.ok(invite.updated_on)
    })
  })
})

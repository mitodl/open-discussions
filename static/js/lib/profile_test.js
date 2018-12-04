/* global SETTINGS */
import { assert } from "chai"

import { initials, getPersonalSite, getSocialSites } from "./profile"
import { PERSONAL_SITE_TYPE } from "./constants"
import { makeProfile, makeUserWebsite } from "../factories/profiles"

describe("initials", () => {
  it("should return capitalized first letter of first two words", () => {
    [
      ["Test user", "TU"],
      ["testuser", "T"],
      ["test Thurston Howell III", "TT"],
      ["", ""]
    ].forEach(([name, expected]) => {
      assert.equal(initials(name), expected)
    })
  })
})

describe("website getter", () => {
  const userWebsiteTypes = [PERSONAL_SITE_TYPE, "twitter", "facebook"]
  let profile

  beforeEach(() => {
    profile = makeProfile()
    profile.user_websites = userWebsiteTypes.map(siteType => {
      const site = makeUserWebsite()
      site.site_type = siteType
      return site
    })
  })

  it("getSocialSites should return all social sites from a Profile object", () => {
    const sites = getSocialSites(profile)
    assert.lengthOf(sites, 2)
    const expectedSocialTypes = userWebsiteTypes.filter(
      siteType => siteType !== PERSONAL_SITE_TYPE
    )
    const returnedSiteTypes = sites.map(site => site.site_type)
    assert.deepEqual(returnedSiteTypes, expectedSocialTypes)
  })

  it("getPersonalSite should return a personal site from a Profile object", () => {
    const site = getPersonalSite(profile)
    assert.isOk(site)
    assert.equal(site.site_type, PERSONAL_SITE_TYPE)
  })
})

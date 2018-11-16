import { assert } from "chai"
import sinon from "sinon"

import {
  makeCommentResult,
  makePostResult,
  makeProfileResult
} from "../factories/search"
import {
  buildSearchQuery,
  channelField,
  searchFields,
  searchResultToComment,
  searchResultToPost,
  searchResultToProfile
} from "./search"
import * as searchFuncs from "./search"

describe("search functions", () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("converts a comment search result to a comment", () => {
    const result = makeCommentResult()
    const comment = searchResultToComment(result)
    assert.deepEqual(comment, {
      author_headline: result.author_headline,
      author_id:       result.author_id,
      author_name:     result.author_name,
      comment_type:    "comment",
      created:         result.created,
      deleted:         result.deleted,
      downvoted:       false,
      edited:          false,
      id:              result.comment_id,
      num_reports:     0,
      parent_id:       result.parent_comment_id,
      post_id:         result.post_id,
      profile_image:   result.author_avatar_small,
      removed:         comment.removed,
      replies:         [],
      score:           comment.score,
      subscribed:      false,
      text:            comment.text,
      upvoted:         false
    })
  })

  it("converts a post search result to a post", () => {
    const result = makePostResult()
    const post = searchResultToPost(result)
    assert.deepEqual(post, {
      author_id:       result.author_id,
      author_name:     result.author_name,
      author_headline: result.author_headline,
      channel_name:    result.channel_name,
      channel_title:   result.channel_title,
      created:         result.created,
      edited:          false,
      id:              result.post_id,
      num_comments:    result.num_comments,
      num_reports:     0,
      profile_image:   result.author_avatar_small,
      removed:         result.removed,
      score:           result.score,
      slug:            result.post_slug,
      stickied:        false,
      subscribed:      false,
      text:            result.text,
      thumbnail:       result.post_link_thumbnail,
      title:           result.post_title,
      upvoted:         false,
      url:             result.post_link_url
    })
  })

  it("converts a profile search result to a profile", () => {
    const result = makeProfileResult()
    const profile = searchResultToProfile(result)
    assert.deepEqual(profile, {
      bio:                  result.author_bio,
      headline:             result.author_headline,
      image:                result.author_avatar_medium,
      image_file:           result.author_avatar_medium,
      image_medium:         result.author_avatar_medium,
      image_medium_file:    result.author_avatar_medium,
      image_small:          result.author_avatar_small,
      image_small_file:     result.author_avatar_small,
      name:                 result.author_name,
      profile_image_medium: result.author_avatar_medium,
      profile_image_small:  result.author_avatar_small,
      username:             result.author_id
    })
  })

  describe("buildSearchQuery", () => {
    it("builds a search query with empty values", () => {
      assert.deepEqual(buildSearchQuery({}), {
        query: {
          bool: {
            should: [
              {
                bool: {
                  filter: {
                    bool: {
                      must: [{ term: { object_type: "comment" } }]
                    }
                  }
                }
              },
              {
                bool: {
                  filter: {
                    bool: {
                      must: [{ term: { object_type: "post" } }]
                    }
                  }
                }
              }
            ]
          }
        }
      })
    })

    it("filters on object type", () => {
      assert.deepEqual(buildSearchQuery({ type: "xyz" }), {
        query: {
          bool: {
            should: [
              {
                bool: {
                  filter: {
                    bool: {
                      must: [{ term: { object_type: "xyz" } }]
                    }
                  }
                }
              }
            ]
          }
        }
      })
    })

    it("paginates with from", () => {
      assert.deepEqual(buildSearchQuery({ from: 0 }), {
        from:  0,
        query: {
          bool: {
            should: [
              {
                bool: {
                  filter: {
                    bool: {
                      must: [{ term: { object_type: "comment" } }]
                    }
                  }
                }
              },
              {
                bool: {
                  filter: {
                    bool: {
                      must: [{ term: { object_type: "post" } }]
                    }
                  }
                }
              }
            ]
          }
        }
      })
    })

    it("paginates with size", () => {
      assert.deepEqual(buildSearchQuery({ size: 4 }), {
        size:  4,
        query: {
          bool: {
            should: [
              {
                bool: {
                  filter: {
                    bool: {
                      must: [{ term: { object_type: "comment" } }]
                    }
                  }
                }
              },
              {
                bool: {
                  filter: {
                    bool: {
                      must: [{ term: { object_type: "post" } }]
                    }
                  }
                }
              }
            ]
          }
        }
      })
    })

    it("filters by channelName", () => {
      const fieldName = "chan_field"
      const stub = sandbox.stub(searchFuncs, "channelField").returns(fieldName)
      const type = "a_type"
      const channelName = "a_channel"
      assert.deepEqual(buildSearchQuery({ type, channelName }), {
        query: {
          bool: {
            should: [
              {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          term: {
                            object_type: type
                          }
                        },
                        {
                          term: {
                            [fieldName]: channelName
                          }
                        }
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      })
      sinon.assert.calledWith(stub, type)
    })

    it("filters by text", () => {
      const fieldNames = ["field1", "field2", "field3"]
      const stub = sandbox.stub(searchFuncs, "searchFields").returns(fieldNames)
      const type = "a_type"
      const text = "some text here"
      assert.deepEqual(buildSearchQuery({ type, text }), {
        query: {
          bool: {
            should: [
              {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          term: {
                            object_type: type
                          }
                        }
                      ]
                    }
                  },
                  must: {
                    multi_match: {
                      fields: fieldNames,
                      query:  text
                    }
                  }
                }
              }
            ]
          }
        }
      })
      sinon.assert.calledWith(stub, type)
    })
  })

  describe("channelField", () => {
    [
      ["post", "channel_name"],
      ["comment", "channel_name"],
      ["profile", "author_channel_membership"]
    ].forEach(([type, field]) => {
      it(`has the right channelField for ${type}`, () => {
        assert.equal(channelField(type), field)
      })
    })
  })

  describe("searchFields", () => {
    [
      ["post", ["text.english", "post_title.english"]],
      ["comment", ["text.english"]],
      ["profile", ["author_headline.english", "author_bio.english"]]
    ].forEach(([type, fields]) => {
      it(`has the right searchFields for ${type}`, () => {
        assert.deepEqual(searchFields(type), fields)
      })
    })
  })
})

import { assert } from "chai"
import sinon from "sinon"
import _ from "lodash"

import {
  makeBootcampResult,
  makeCommentResult,
  makeCourseResult,
  makePostResult,
  makeProfileResult,
  makeLearningResourceResult
} from "../factories/search"
import {
  AVAILABILITY_MAPPING,
  buildSearchQuery,
  channelField,
  RESOURCE_QUERY_NESTED_FIELDS,
  searchFields,
  searchResultToComment,
  searchResultToLearningResource,
  searchResultToPost,
  searchResultToProfile
} from "./search"
import * as searchFuncs from "./search"
import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  DEFAULT_START_DT
} from "../lib/constants"

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
      article_content: result.article_content,
      plain_text:      result.plain_text,
      cover_image:     null,
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
      post_type:       result.post_type,
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

  it("converts a course search result to a learning resource", () => {
    const result = makeCourseResult()
    const course = searchResultToLearningResource(result)
    assert.deepEqual(course, {
      id:          result.id,
      title:       result.title,
      image_src:   result.image_src,
      platform:    result.platform,
      topics:      result.topics.map(topic => ({ name: topic })),
      object_type: LR_TYPE_COURSE,
      offered_by:  result.offered_by,
      course_runs: result.course_runs
    })
  })

  it("converts a bootcamp search result to a learning resource", () => {
    const result = makeBootcampResult()
    const bootcamp = searchResultToLearningResource(result)
    assert.deepEqual(bootcamp, {
      id:          result.id,
      title:       result.title,
      image_src:   result.image_src,
      platform:    null,
      topics:      result.topics.map(topic => ({ name: topic })),
      object_type: LR_TYPE_BOOTCAMP,
      offered_by:  "bootcamps",
      course_runs: result.course_runs
    })
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].forEach(objectType => {
    it(`takes an overrideObject with ${objectType}`, () => {
      const result = makeLearningResourceResult(objectType)
      const object = searchResultToLearningResource(result, {
        test_field: true
      })
      assert.isTrue(object.test_field)
    })
  })

  describe("buildSearchQuery", () => {
    it("builds a search query with empty values", () => {
      assert.deepEqual(buildSearchQuery({}), {
        query: {
          bool: {
            should: ["comment", "post", "profile"].map(objectType => ({
              bool: {
                filter: {
                  bool: {
                    must: [{ term: { object_type: objectType } }]
                  }
                }
              }
            }))
          }
        }
      })
    })

    it("filters on object type", () => {
      assert.deepEqual(buildSearchQuery({ type: "xyz" }), {
        query: {
          bool: {
            should: ["xyz"].map(objectType => ({
              bool: {
                filter: {
                  bool: {
                    must: [{ term: { object_type: objectType } }]
                  }
                }
              }
            }))
          }
        }
      })
    })

    it("paginates with from", () => {
      assert.deepEqual(buildSearchQuery({ from: 0 }), {
        from:  0,
        query: {
          bool: {
            should: ["comment", "post", "profile"].map(objectType => ({
              bool: {
                filter: {
                  bool: {
                    must: [{ term: { object_type: objectType } }]
                  }
                }
              }
            }))
          }
        }
      })
    })

    it("paginates with size", () => {
      assert.deepEqual(buildSearchQuery({ size: 4 }), {
        size:  4,
        query: {
          bool: {
            should: ["comment", "post", "profile"].map(objectType => ({
              bool: {
                filter: {
                  bool: {
                    must: [{ term: { object_type: objectType } }]
                  }
                }
              }
            }))
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
                  should: [
                    {
                      multi_match: {
                        query:     text,
                        fields:    fieldNames,
                        fuzziness: "AUTO"
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      })
      sinon.assert.calledWith(stub, type)
    })
    ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].forEach(type => {
      ["availableNow", "nextWeek", null].forEach(availability => {
        it(`filters courses by platform, availability ${availability}, type ${type}, and topics`, () => {
          const fieldNames = ["field1", "field2", "field3"]
          const stub = sandbox
            .stub(searchFuncs, "searchFields")
            .returns(fieldNames)
          const text = "some text here"
          const facets = new Map(
            Object.entries({
              offered_by:   ["MITx"],
              cost:         ["free"],
              topics:       ["Engineering", "Science"],
              availability: availability ? [availability] : [],
              type:         [type]
            })
          )

          const availabilityShouldItems = availability
            ? [
              {
                nested: {
                  path:  "course_runs",
                  query: {
                    range: {
                      "course_runs.best_start_date":
                          AVAILABILITY_MAPPING[availability].filter
                    }
                  }
                }
              }
            ]
            : []

          if (availability === "availableNow") {
            availabilityShouldItems.push({
              nested: {
                path:  "course_runs",
                query: {
                  bool: {
                    must_not: {
                      exists: {
                        field: "course_runs.best_start_date"
                      }
                    }
                  }
                }
              }
            })
          }

          const availabilityQuery = {
            bool: {
              should: availabilityShouldItems
            }
          }

          const mustQuery = [
            {
              term: {
                object_type: type
              }
            },
            {
              bool: {
                should: [
                  {
                    term: {
                      offered_by: "MITx"
                    }
                  }
                ]
              }
            },
            {
              bool: {
                should: [
                  {
                    nested: {
                      path:  "course_runs.prices",
                      query: {
                        range: {
                          "course_runs.prices.price": {
                            to: 0.01
                          }
                        }
                      }
                    }
                  }
                ]
              }
            },
            {
              bool: {
                should: [
                  {
                    term: {
                      topics: "Engineering"
                    }
                  },
                  {
                    term: {
                      topics: "Science"
                    }
                  }
                ]
              }
            }
          ]

          if (availability) {
            mustQuery.push(availabilityQuery)
          }

          assert.deepEqual(buildSearchQuery({ type, text, facets }), {
            aggs: {
              availability: {
                aggs: {
                  runs: {
                    aggs: {
                      courses: {
                        reverse_nested: {}
                      }
                    },
                    date_range: {
                      field:   "course_runs.best_start_date",
                      keyed:   false,
                      missing: DEFAULT_START_DT,
                      ranges:  [
                        {
                          key: "availableNow",
                          to:  "now"
                        },
                        {
                          from: "now",
                          key:  "nextWeek",
                          to:   "now+7d"
                        },
                        {
                          from: "now",
                          key:  "nextMonth",
                          to:   "now+1M"
                        },
                        {
                          from: "now",
                          key:  "next3Months",
                          to:   "now+3M"
                        },
                        {
                          from: "now",
                          key:  "next6Months",
                          to:   "now+6M"
                        },
                        {
                          from: "now",
                          key:  "nextYear",
                          to:   "now+12M"
                        }
                      ]
                    }
                  }
                },
                nested: {
                  path: "course_runs"
                }
              },
              cost: {
                aggs: {
                  prices: {
                    aggs: {
                      courses: {
                        reverse_nested: {}
                      }
                    },
                    range: {
                      field:   "course_runs.prices.price",
                      keyed:   false,
                      missing: 0,
                      ranges:  [
                        {
                          key: "free",
                          to:  0.01
                        },
                        {
                          from: 0.01,
                          key:  "paid"
                        }
                      ]
                    }
                  }
                },
                nested: {
                  path: "course_runs.prices"
                }
              },
              offered_by: {
                terms: {
                  field: "offered_by",
                  size:  10000
                }
              },
              topics: {
                terms: {
                  field: "topics",
                  size:  10000
                }
              },
              type: {
                terms: {
                  field: "object_type.keyword",
                  size:  10000
                }
              }
            },
            query: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: {
                        bool: {
                          must: mustQuery
                        }
                      },
                      should: [
                        {
                          multi_match: {
                            query:     text,
                            fields:    fieldNames,
                            fuzziness: "AUTO"
                          }
                        },
                        {
                          nested: {
                            path:  "course_runs",
                            query: {
                              multi_match: {
                                query:     text,
                                fields:    RESOURCE_QUERY_NESTED_FIELDS,
                                fuzziness: "AUTO"
                              }
                            }
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          })
          sinon.assert.calledWith(stub, type)
        })
      })
    })

    //
    ;[
      ["asc", "simple option"],
      [
        {
          order:       "asc",
          nested_path: "hey there",
          mode:        "min"
        },
        "custom sort option"
      ]
    ].forEach(([searchOption, description]) => {
      it(`puts in a sort value when given a ${description}`, () => {
        assert.deepEqual(
          buildSearchQuery({
            sort: {
              field:  "bestfield",
              option: searchOption
            }
          }),
          {
            query: {
              bool: {
                should: ["comment", "post", "profile"].map(objectType => ({
                  bool: {
                    filter: {
                      bool: {
                        must: [{ term: { object_type: objectType } }]
                      }
                    }
                  }
                }))
              }
            },
            sort: [
              {
                bestfield: _.isString(searchOption)
                  ? {
                    order: "asc"
                  }
                  : searchOption
              }
            ]
          }
        )
      })
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
      ["post", ["text.english", "post_title.english", "plain_text.english"]],
      ["comment", ["text.english"]],
      [
        "profile",
        ["author_headline.english", "author_bio.english", "author_name.english"]
      ],
      [
        "course",
        [
          "title.english",
          "short_description.english",
          "full_description.english",
          "topics",
          "platform",
          "course_id",
          "offered_by"
        ]
      ],
      ["program", ["title.english", "short_description.english", "topics"]],
      ["user_list", ["title.english", "short_description.english", "topics"]]
    ].forEach(([type, fields]) => {
      it(`has the right searchFields for ${type}`, () => {
        assert.deepEqual(searchFields(type), fields)
      })
    })
  })
})

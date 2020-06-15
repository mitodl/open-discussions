/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import _ from "lodash"
import bodybuilder from "bodybuilder"

import {
  makeCommentResult,
  makeCourseResult,
  makePostResult,
  makeProfileResult,
  makeLearningResourceResult,
  makeProgramResult
} from "../factories/search"
import {
  RESOURCE_QUERY_NESTED_FIELDS,
  buildSearchQuery,
  channelField,
  searchFields,
  searchResultToComment,
  searchResultToLearningResource,
  searchResultToPost,
  searchResultToProfile,
  buildLearnQuery,
  buildDefaultSort
} from "./search"
import * as searchFuncs from "./search"
import {
  LR_TYPE_ALL,
  LR_TYPE_COURSE,
  LR_TYPE_VIDEO,
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_PODCAST,
  LR_TYPE_PODCAST_EPISODE
} from "../lib/constants"
import { LR_TYPE_PROGRAM } from "./constants"
import { shouldIf } from "./test_utils"

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
      id:            result.id,
      title:         result.title,
      image_src:     result.image_src,
      platform:      result.platform,
      topics:        result.topics.map(topic => ({ name: topic })),
      object_type:   LR_TYPE_COURSE,
      offered_by:    result.offered_by,
      runs:          result.runs,
      is_favorite:   result.is_favorite,
      lists:         result.lists,
      audience:      result.audience,
      certification: result.certification
    })
  })

  it("converts a program search result to a learning resource", () => {
    const result = makeProgramResult()
    const program = searchResultToLearningResource(result)
    assert.deepEqual(program, {
      id:            result.id,
      title:         result.title,
      image_src:     result.image_src,
      platform:      null,
      topics:        result.topics.map(topic => ({ name: topic })),
      object_type:   LR_TYPE_PROGRAM,
      offered_by:    result.offered_by,
      runs:          result.runs,
      is_favorite:   result.is_favorite,
      lists:         result.lists,
      audience:      result.audience,
      certification: result.certification
    })
  })

  it("converts a video search result to a learning resource", () => {
    const result = makeLearningResourceResult(LR_TYPE_VIDEO)
    const video = searchResultToLearningResource(result)
    assert.deepEqual(video, {
      id:            result.id,
      title:         result.title,
      image_src:     result.image_src,
      platform:      null,
      topics:        result.topics.map(topic => ({ name: topic })),
      object_type:   LR_TYPE_VIDEO,
      offered_by:    result.offered_by,
      runs:          result.runs,
      is_favorite:   result.is_favorite,
      lists:         result.lists,
      audience:      result.audience,
      certification: result.certification
    })
  })

  it("converts a podcast search result to a learning resource", () => {
    const result = makeLearningResourceResult(LR_TYPE_PODCAST)
    const podcast = searchResultToLearningResource(result)
    assert.deepEqual(podcast, {
      id:            result.id,
      title:         result.title,
      image_src:     result.image_src,
      platform:      null,
      topics:        result.topics.map(topic => ({ name: topic })),
      object_type:   LR_TYPE_PODCAST,
      offered_by:    result.offered_by,
      runs:          result.runs,
      is_favorite:   result.is_favorite,
      lists:         result.lists,
      audience:      result.audience,
      certification: result.certification
    })
  })

  it("converts a podcast episode search result to a learning resource", () => {
    const result = makeLearningResourceResult(LR_TYPE_PODCAST_EPISODE)
    const podcastEpisode = searchResultToLearningResource(result)
    assert.deepEqual(podcastEpisode, {
      id:            result.id,
      title:         result.title,
      image_src:     result.image_src,
      platform:      null,
      topics:        result.topics.map(topic => ({ name: topic })),
      object_type:   LR_TYPE_PODCAST_EPISODE,
      offered_by:    result.offered_by,
      runs:          result.runs,
      is_favorite:   result.is_favorite,
      lists:         result.lists,
      audience:      result.audience,
      certification: result.certification
    })
  })

  //
  ;[LR_TYPE_USERLIST, LR_TYPE_LEARNINGPATH].forEach(listType => {
    it(`converts a ${listType} search result to a learning resource`, () => {
      const result = makeLearningResourceResult(listType)
      const video = searchResultToLearningResource(result)
      assert.deepEqual(video, {
        id:            result.id,
        title:         result.title,
        image_src:     result.image_src,
        platform:      null,
        topics:        result.topics.map(topic => ({ name: topic })),
        object_type:   listType,
        offered_by:    result.offered_by,
        runs:          result.runs,
        is_favorite:   result.is_favorite,
        lists:         result.lists,
        audience:      result.audience,
        certification: result.certification
      })
    })
  })

  //
  ;[
    LR_TYPE_COURSE,
    LR_TYPE_VIDEO,
    LR_TYPE_PODCAST,
    LR_TYPE_PODCAST_EPISODE
  ].forEach(objectType => {
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
      const textQuery = {
        should: [
          {
            multi_match: {
              query:  text,
              fields: fieldNames
            }
          }
        ]
      }

      const suggestQuery = {
        suggest_field1: {
          phrase: {
            collate: {
              params: {
                field_name: "suggest_field1"
              },
              prune: true,
              query: {
                source: {
                  match_phrase: {
                    "{{field_name}}": "{{suggestion}}"
                  }
                }
              }
            },
            confidence: 0.0001,
            field:      "suggest_field1",
            gram_size:  1,
            max_errors: 3,
            size:       5
          }
        },
        suggest_field2: {
          phrase: {
            collate: {
              params: {
                field_name: "suggest_field2"
              },
              prune: true,
              query: {
                source: {
                  match_phrase: {
                    "{{field_name}}": "{{suggestion}}"
                  }
                }
              }
            },
            confidence: 0.0001,
            field:      "suggest_field2",
            gram_size:  1,
            max_errors: 3,
            size:       5
          }
        },
        text: "some text here"
      }

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
                        },
                        {
                          bool: textQuery
                        }
                      ]
                    }
                  },
                  ...textQuery
                }
              }
            ]
          }
        },
        suggest: suggestQuery
      })
      sinon.assert.calledWith(stub, type)
    })

    it(`filters courses by platform and topics`, () => {
      const type = LR_TYPE_COURSE
      const fieldNames = ["field1", "field2", "field3"]
      const stub = sandbox.stub(searchFuncs, "searchFields").returns(fieldNames)
      const text = "some text here"
      const facets = new Map(
        Object.entries({
          offered_by: ["MITx"],
          topics:     ["Engineering", "Science"],
          type:       [type]
        })
      )

      const innerTextQuery = {
        multi_match: {
          query:  text,
          fields: fieldNames
        }
      }

      const textQueryRuns = {
        nested: {
          path:  "runs",
          query: {
            multi_match: {
              query:  text,
              fields: RESOURCE_QUERY_NESTED_FIELDS
            }
          }
        }
      }

      const textQuery = []
      LR_TYPE_ALL.forEach(type => {
        const innerQuery = [LR_TYPE_COURSE, LR_TYPE_PROGRAM].includes(type)
          ? [innerTextQuery, textQueryRuns]
          : [innerTextQuery]
        textQuery.push({
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
                    bool: {
                      should: innerQuery
                    }
                  }
                ]
              }
            },
            should: innerQuery
          }
        })
      })

      assert.deepEqual(buildSearchQuery({ type, text, facets }), {
        aggs: {
          agg_filter_offered_by: {
            aggs: {
              offered_by: {
                terms: {
                  field: "offered_by",
                  size:  10000
                }
              }
            },
            filter: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: {
                        bool: {
                          must: [
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
                            },
                            {
                              bool: {
                                should: [
                                  {
                                    term: {
                                      "object_type.keyword": "course"
                                    }
                                  }
                                ]
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
          },
          agg_filter_topics: {
            aggs: {
              topics: {
                terms: {
                  field: "topics",
                  size:  10000
                }
              }
            },
            filter: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: {
                        bool: {
                          must: [
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
                                    term: {
                                      "object_type.keyword": "course"
                                    }
                                  }
                                ]
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
          },
          agg_filter_type: {
            aggs: {
              type: {
                terms: {
                  field: "object_type.keyword",
                  size:  10000
                }
              }
            },
            filter: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: {
                        bool: {
                          must: [
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
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        post_filter: {
          bool: {
            must: [
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
              },
              {
                bool: {
                  should: [
                    {
                      term: {
                        "object_type.keyword": "course"
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        query: {
          bool: {
            should: textQuery
          }
        },
        suggest: {
          "short_description.trigram": {
            phrase: {
              collate: {
                params: {
                  field_name: "short_description.trigram"
                },
                prune: true,
                query: {
                  source: {
                    match_phrase: {
                      "{{field_name}}": "{{suggestion}}"
                    }
                  }
                }
              },
              confidence: 0.0001,
              field:      "short_description.trigram",
              gram_size:  1,
              max_errors: 3,
              size:       5
            }
          },
          text:            "some text here",
          "title.trigram": {
            phrase: {
              collate: {
                params: {
                  field_name: "title.trigram"
                },
                prune: true,
                query: {
                  source: {
                    match_phrase: {
                      "{{field_name}}": "{{suggestion}}"
                    }
                  }
                }
              },
              confidence: 0.0001,
              field:      "title.trigram",
              gram_size:  1,
              max_errors: 3,
              size:       5
            }
          }
        }
      })
      sinon.assert.calledWith(stub, type)
    })

    it(`sorts the search results when there are no filters or text`, () => {
      const query = buildLearnQuery(bodybuilder(), null, LR_TYPE_ALL, null)
      assert.deepEqual(query.sort, buildDefaultSort())
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
          "title.english^3",
          "short_description.english^2",
          "full_description.english",
          "topics",
          "platform",
          "course_id",
          "coursenum^5",
          "offered_by"
        ]
      ],
      ["program", ["title.english^3", "short_description.english^2", "topics"]],
      [
        "userlist",
        ["title.english^3", "short_description.english^2", "topics"]
      ],
      [
        "video",
        [
          "title.english^3",
          "short_description.english^2",
          "full_description.english",
          "transcript.english^2",
          "topics",
          "platform",
          "video_id",
          "offered_by"
        ]
      ]
    ].forEach(([type, fields]) => {
      it(`has the right searchFields for ${type}`, () => {
        assert.deepEqual(searchFields(type), fields)
      })
    })
  })
  ;[
    ['"mechanical engineering"', "query_string"],
    ["'mechanical engineering\"", "multi_match"],
    ["'mechanical engineering'", "multi_match"],
    ["mechanical engineering", "multi_match"]
  ].forEach(([text, queryType]) => {
    it(`constructs a ${queryType} query on text ${text}`, () => {
      const esQuery = buildLearnQuery(
        bodybuilder(),
        text,
        [LR_TYPE_COURSE],
        null
      )
      assert.deepEqual(
        Object.keys(esQuery.query.bool.should[0].bool.should[0]),
        [queryType]
      )
    })
  })
  ;[[LR_TYPE_COURSE, true, true], [LR_TYPE_COURSE, false, false]].forEach(
    ([resourceType, fileSearchEnabled, includeChildQuery]) => {
      it(`${shouldIf(
        includeChildQuery
      )} include a childQuery for ${resourceType} if fileSearchEnabled is ${String(
        fileSearchEnabled
      )}`, () => {
        SETTINGS.file_search_enabled = fileSearchEnabled
        const text = "search query"
        const esQuery = buildLearnQuery(
          bodybuilder(),
          text,
          [resourceType],
          null
        )
        assert.equal(
          esQuery.query.bool.should[0].bool.should.length,
          includeChildQuery ? 3 : 2
        )
        if (includeChildQuery) {
          assert.deepEqual(esQuery.query.bool.should[0].bool.should[2], {
            has_child: {
              type:  "resourcefile",
              query: {
                multi_match: {
                  query:  text,
                  fields: ["content", "title", "short_description"]
                }
              },
              score_mode: "avg"
            }
          })
        }
      })
    }
  )
})

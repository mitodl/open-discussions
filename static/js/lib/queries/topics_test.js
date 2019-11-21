// @flow

import { mergeAll, times } from "ramda"
import { makeTopic } from "../../factories/learning_resources"
import { constructIdMap } from "../redux_query"
import { assert } from "chai"
import { topicApiURL } from "../url"
import { getTopicsRequest, topicsArraySelector } from "./topics"

describe("Topics API", () => {
  let topics, testState

  beforeEach(() => {
    topics = times(makeTopic, 2)
    testState = {
      entities: {
        topics: mergeAll(constructIdMap(topics))
      }
    }
  })

  it("topics request allows fetching a list of topics", () => {
    const request = getTopicsRequest()
    assert.equal(request.url, `${topicApiURL}`)
    assert.deepEqual(request.transform({ results: topics }), {
      topics: constructIdMap(topics)
    })
  })

  it("topicsSelector should grab all topic entities from state", () => {
    assert.deepEqual(
      topicsArraySelector(testState),
      Object.keys(topics).map(key => topics[key])
    )
  })
})

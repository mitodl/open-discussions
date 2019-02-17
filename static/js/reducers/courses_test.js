// @flow
import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { assert } from "chai"

describe("course reducers", () => {
  let helper, dispatchThen

  const aggregateResponse = {
    hits:         { total: 1313, max_score: 0.0, hits: [] },
    aggregations: {
      topics: {
        buckets: [
          { key: "Engineering", doc_count: 323 },
          { key: "Science", doc_count: 234 },
          { key: "Math", doc_count: 214 }
        ]
      },
      platform: {
        buckets: [
          { key: "mitx", doc_count: 632 },
          { key: "ocw", doc_count: 398 }
        ]
      }
    }
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    dispatchThen = helper.store.createDispatchThen(state => state.coursefacets)
    helper.aggregateStub.returns(Promise.resolve(aggregateResponse))
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should fetch aggregation results", async () => {
    const { data } = await dispatchThen(actions.coursefacets.get(), [
      actions.coursefacets.get.requestType,
      actions.coursefacets.get.successType
    ])
    assert.deepEqual(data, {
      platforms: aggregateResponse.aggregations.platform.buckets.map(
        bucket => bucket.key
      ),
      topics: aggregateResponse.aggregations.topics.buckets.map(
        bucket => bucket.key
      )
    })
  })
})

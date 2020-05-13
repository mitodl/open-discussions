import { assert } from "chai"

import { deserializeSearchParams, serializeSearchParams } from "./course_search"

describe("course search library", () => {
  describe("deserializeSearchParams", () => {
    it("should deserialize text from the URL", () => {
      assert.deepEqual(
        deserializeSearchParams({ search: "q=The Best Course" }),
        {
          activeFacets: {
            offered_by: [],
            topics:     [],
            type:       []
          },
          text: "The Best Course"
        }
      )
    })

    it("should deserialize offered by", () => {
      assert.deepEqual(deserializeSearchParams({ search: "o=MITx" }), {
        activeFacets: {
          offered_by: ["MITx"],
          topics:     [],
          type:       []
        },
        text: undefined
      })
    })

    it("should deserialize topics from the URL", () => {
      assert.deepEqual(
        deserializeSearchParams({
          search:
            "t=Science&t=Physics&t=Chemistry&t=Computer%20Science&t=Electronics"
        }),
        {
          activeFacets: {
            offered_by: [],
            topics:     [
              "Science",
              "Physics",
              "Chemistry",
              "Computer Science",
              "Electronics"
            ],
            type: []
          },
          text: undefined
        }
      )
    })

    it("should deserialize type from the URL", () => {
      assert.deepEqual(deserializeSearchParams({ search: "type=course" }), {
        activeFacets: {
          offered_by: [],
          topics:     [],
          type:       ["course"]
        },
        text: undefined
      })
    })

    it("should ignore unknown params", () => {
      assert.deepEqual(deserializeSearchParams({ search: "eeee=beeeeeep" }), {
        activeFacets: {
          offered_by: [],
          topics:     [],
          type:       []
        },
        text: undefined
      })
    })
  })

  describe("serializeSearchParams", () => {
    it("should serialize text to URL", () => {
      assert.deepEqual(
        serializeSearchParams({
          text:         "my search text",
          activeFacets: {}
        }),
        "q=my%20search%20text"
      )
    })

    it("should not serialize empty text string", () => {
      assert.deepEqual(
        serializeSearchParams({
          text:         "",
          activeFacets: {}
        }),
        ""
      )
    })

    it("should serialize topics", () => {
      assert.deepEqual(
        serializeSearchParams({
          activeFacets: {
            topics: [
              "Science",
              "Physics",
              "Chemistry",
              "Computer Science",
              "Electronics"
            ]
          }
        }),
        "t=Science&t=Physics&t=Chemistry&t=Computer%20Science&t=Electronics"
      )
    })

    it("should serialize offered by", () => {
      assert.deepEqual(
        serializeSearchParams({
          activeFacets: {
            offered_by: ["MITx"]
          }
        }),
        "o=MITx"
      )
    })

    it("should serialize type to the URL", () => {
      assert.deepEqual(
        serializeSearchParams({
          activeFacets: {
            type: ["course"]
          }
        }),
        "type=course"
      )
    })
  })
})

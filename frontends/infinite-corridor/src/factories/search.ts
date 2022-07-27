//@ts-expect-error casual-browserify does not have typescript types
import casual from "casual-browserify"
import R from "ramda"
import {
  DATE_FORMAT,
  LearningResourceResult,
  LearningResourceRun
} from "ol-search-ui"

const OPEN_CONTENT = "Open Content"
const PROFESSIONAL = "Professional Offerings"
const CERTIFICATE = "Certificates"

export const makeSearchResult = (type: string | null) => {
  if (!type) {
    type = casual.random_element(["course", "program"])
  }
  let hit
  switch (type) {
  case "course":
    hit = makeCourseResult()
    break
  case "program":
    hit = makeProgramResult()
    break
  default:
    throw new Error("unknown type")
  }

  return {
    _id:     `id_String${casual.random}`,
    _source: hit
  }
}

export const makeCourseResult = (): LearningResourceResult => ({
  id:                casual.integer(1, 1000),
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  platform:          casual.random_element(["edx", "ocw"]),
  offered_by:        [casual.random_element(["edx", "ocw"])],
  topics:            [casual.word, casual.word],
  object_type:       "course",
  runs:              R.times(makeRun, 3),
  is_favorite:       casual.coin_flip,
  lists:             casual.random_element([[], [100, 200]]),
  audience:          casual.random_element([
    [],
    [OPEN_CONTENT],
    [PROFESSIONAL],
    [OPEN_CONTENT, PROFESSIONAL]
  ]),
  certification: casual.random_element([[], [CERTIFICATE]])
})

export const makeProgramResult = (): LearningResourceResult => ({
  id:                casual.integer(1, 1000),
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  topics:            [casual.word, casual.word],
  object_type:       "program",
  offered_by:        [casual.random_element(["xpro", "micromasters"])],
  runs:              [makeRun()],
  is_favorite:       casual.coin_flip,
  lists:             casual.random_element([[], [100, 200]]),
  audience:          casual.random_element([
    [],
    [OPEN_CONTENT],
    [PROFESSIONAL],
    [OPEN_CONTENT, PROFESSIONAL]
  ]),
  certification: casual.random_element([[], [CERTIFICATE]])
})

export const makeRun = (): LearningResourceRun => {
  return {
    id:               casual.integer(1, 1000),
    url:              casual.url,
    language:         casual.random_element(["en-US", "fr", null]),
    semester:         casual.random_element(["Fall", "Spring", null]),
    year:             casual.year,
    level:            casual.random_element(["Graduate", "Undergraduate", null]),
    start_date:       casual.date(DATE_FORMAT),
    end_date:         casual.date(DATE_FORMAT),
    best_start_date:  casual.date(DATE_FORMAT),
    best_end_date:    casual.date(DATE_FORMAT),
    enrollment_start: casual.date(DATE_FORMAT),
    enrollment_end:   casual.date(DATE_FORMAT),
    availability:     casual.random_element(["archived", "current", "Upcoming"]),
    instructors:      [
      {
        first_name: casual.name,
        last_name:  casual.name,
        full_name:  casual.name
      },
      {
        first_name: casual.name,
        last_name:  casual.name,
        full_name:  casual.name
      }
    ],
    prices: [{ mode: "audit", price: casual.integer(1, 1000) }]
  }
}

export const makeSearchResponse = (
  pageSize: number = SETTINGS.search_page_size,
  total: number = SETTINGS.search_page_size * 2,
  type: string | null,
  withFacets = false
) => {
  const hits = R.range(0, pageSize).map(() => makeSearchResult(type))
  return {
    hits: {
      total,
      hits
    },
    suggest:      ["engineer", "engineering", "engines"],
    aggregations: withFacets ? makeSearchFacetResult() : {}
  }
}

export const makeSearchFacetResult = () => {
  return {
    offered_by: {
      buckets: [
        { key: "MITx", doc_count: 88 },
        { key: "OCW", doc_count: 102 }
      ]
    },
    topics: {
      buckets: [
        { key: "Science", doc_count: 172 },
        { key: "Physics", doc_count: 32 }
      ]
    },
    audience:        [OPEN_CONTENT],
    certification:   [],
    department_name: [],
    type:            ["course"]
  }
}

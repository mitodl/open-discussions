//@ts-expect-error casual-browserify does not have typescript types
import casual from "casual-browserify"
import { faker } from "@faker-js/faker"
import { DATE_FORMAT } from "./util"
import { Factory } from "ol-util/build/factories"
import {
  CourseTopic,
  LearningResourceResult,
  LearningResourceRun,
  LearningResource,
  LearningResourceType,
  CardMinimalResource,
  EmbedlyConfig
} from "./interfaces"

import { pick, times } from "lodash"
import moment from "moment"

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

export const makeCourseResult: Factory<LearningResourceResult> = overrides => ({
  id:                faker.unique(faker.datatype.number),
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  platform:          casual.random_element(["edx", "ocw"]),
  offered_by:        [casual.random_element(["edx", "ocw"])],
  topics:            [casual.word, casual.word],
  object_type:       LearningResourceType.Course,
  runs:              times(3, () => makeRun()),
  is_favorite:       casual.coin_flip,
  lists:             casual.random_element([[], [100, 200]]),
  audience:          casual.random_element([
    [],
    [OPEN_CONTENT],
    [PROFESSIONAL],
    [OPEN_CONTENT, PROFESSIONAL]
  ]),
  certification: casual.random_element([[], [CERTIFICATE]]),
  ...overrides
})

export const makeProgramResult: Factory<
  LearningResourceResult
> = overrides => ({
  id:                faker.unique(faker.datatype.number),
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  topics:            [casual.word, casual.word],
  object_type:       LearningResourceType.Program,
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
  certification: casual.random_element([[], [CERTIFICATE]]),
  platform:      faker.word.noun(),
  ...overrides
})

export const makeVideoResult: Factory<LearningResourceResult> = overrides => ({
  id:                faker.unique(faker.datatype.number),
  video_id:          `video_${String(casual.random)}`,
  title:             casual.title,
  url:               casual.url,
  is_favorite:       casual.boolean,
  last_modified:     casual.date(DATE_FORMAT),
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  duration:          moment.duration(casual.integer(30, 60 * 90) * 1000).toISOString(),
  object_type:       LearningResourceType.Video,
  offered_by:        [casual.random_element(["mitc", "ocw"])],
  runs:              [],
  lists:             [],
  audience:          [],
  certification:     [],
  platform:          faker.word.noun(),
  ...overrides
})

export const makeRun: Factory<LearningResourceRun> = overrides => {
  return {
    id:               faker.unique(faker.datatype.number),
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
    prices: [{ mode: "audit", price: casual.integer(1, 1000) }],
    ...overrides
  }
}

const TEST_SEARCH_PAGE_SIZE = 4
export const makeSearchResponse = (
  pageSize: number = TEST_SEARCH_PAGE_SIZE,
  total: number = 2 * TEST_SEARCH_PAGE_SIZE,
  type: string | null = null,
  withFacets = true
) => {
  const hits = times(pageSize, () => makeSearchResult(type))
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
    certification: {
      buckets: [{ key: "Certificates", doc_count: 10 }]
    },
    type: {
      buckets: [
        { key: "course", doc_count: 180 },
        { key: "program", doc_count: 9 }
      ]
    }
  }
}

const makeLearningResourceType = () =>
  faker.helpers.arrayElement(Object.values(LearningResourceType))

export const makeTopic: Factory<CourseTopic> = overrides => {
  const topic: CourseTopic = {
    id:   faker.unique(faker.datatype.number),
    name: faker.lorem.words(),
    ...overrides
  }
  return topic
}

export const makeLearningResource: Factory<LearningResource> = overrides => {
  const resource: LearningResource = {
    id:            faker.unique(faker.datatype.number),
    title:         faker.lorem.words(),
    image_src:     new URL(faker.internet.url()).toString(),
    topics:        times(2, () => makeTopic()),
    object_type:   makeLearningResourceType(),
    platform:      faker.lorem.word(),
    runs:          times(3, () => makeRun()),
    lists:         [],
    certification: [],
    ...overrides
  }
  return resource
}

export const makeMinimalResoure: Factory<CardMinimalResource> = overrides => {
  const keys = [
    "runs",
    "certification",
    "title",
    "offered_by",
    "object_type",
    "image_src",
    "platform"
  ] as const
  return {
    ...pick(makeCourseResult(), keys),
    ...overrides
  } as CardMinimalResource
}

export const makeImgConfig: Factory<EmbedlyConfig> = overrides => {
  const imgConfig = {
    width:      faker.datatype.number(),
    height:     faker.datatype.number(),
    embedlyKey: faker.datatype.uuid(),
    ocwBaseUrl: faker.internet.url()
  }
  return {
    ...imgConfig,
    ...overrides
  }
}

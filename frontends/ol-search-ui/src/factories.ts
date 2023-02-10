//@ts-expect-error casual-browserify does not have typescript types
import casual from "casual-browserify"
import { faker } from "@faker-js/faker"
import { DATE_FORMAT } from "./util"
import { Factory, makePaginatedFactory } from "ol-util/build/factories"
import {
  CourseTopic,
  LearningResourceResult,
  LearningResourceRun,
  LearningResource,
  LearningResourceType,
  EmbedlyConfig,
  Course,
  UserList,
  UserListItem,
  PrivacyLevel
} from "./interfaces"

import { times } from "lodash"
import moment from "moment"

const OPEN_CONTENT = "Open Content"
const PROFESSIONAL = "Professional Offerings"
const CERTIFICATE = "Certificates"

export const makeTopic: Factory<CourseTopic> = overrides => {
  const topic: CourseTopic = {
    id:   faker.unique(faker.datatype.number),
    name: faker.lorem.words(),
    ...overrides
  }
  return topic
}

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

export const makeCourse: Factory<Course> = overrides => ({
  id:                faker.unique(faker.datatype.number),
  title:             faker.lorem.words(),
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  platform:          casual.random_element(["edx", "ocw"]),
  offered_by:        [casual.random_element(["edx", "ocw"])],
  topics:            times(2, () => makeTopic()),
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

export const makeProgram: Factory<LearningResource> = overrides => ({
  id:                faker.unique(faker.datatype.number),
  title:             faker.lorem.words(),
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  topics:            times(2, () => makeTopic()),
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

export const makeVideo: Factory<LearningResource> = overrides => ({
  id:                faker.unique(faker.datatype.number),
  video_id:          `video_${String(casual.random)}`,
  title:             faker.lorem.words(),
  url:               casual.url,
  is_favorite:       casual.boolean,
  last_modified:     casual.date(DATE_FORMAT),
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  duration:          moment.duration(casual.integer(30, 60 * 90) * 1000).toISOString(),
  object_type:       LearningResourceType.Video,
  offered_by:        [casual.random_element(["mitc", "ocw"])],
  runs:              undefined,
  lists:             [],
  audience:          [],
  certification:     [],
  topics:            [],
  platform:          faker.word.noun(),
  ...overrides
})

export const makeUserList: Factory<UserList> = overrides => {
  const type = faker.helpers.arrayElement([
    LearningResourceType.Userlist,
    LearningResourceType.LearningPath
  ] as const)
  const userList: UserList = {
    id:                faker.unique(faker.datatype.number),
    short_description: faker.lorem.paragraph(),
    offered_by:        [],
    title:             faker.lorem.words(),
    topics:            times(2, () => makeTopic()),
    is_favorite:       faker.datatype.boolean(),
    image_src:         new URL(faker.internet.url()).toString(),
    image_description: faker.helpers.arrayElement([
      null,
      faker.lorem.sentence()
    ]),
    item_count:    faker.datatype.number({ min: 2, max: 5 }),
    object_type:   type,
    list_type:     type,
    privacy_level: faker.helpers.arrayElement([
      PrivacyLevel.Public,
      PrivacyLevel.Private
    ]),
    author:        faker.datatype.number({ min: 1, max: 1000 }),
    lists:         [],
    certification: [],
    author_name:   faker.name.findName(),
    ...overrides
  }
  return userList
}

const resultMakers = {
  course:  makeCourse,
  program: makeProgram,
  video:   makeVideo
}
type MakeableResultType = keyof typeof resultMakers

const makeSearchResult = (
  type?: MakeableResultType
): {
  _id: string
  _source: LearningResourceResult
} => {
  const maker = type ?
    resultMakers[type] :
    faker.helpers.arrayElement(Object.values(resultMakers))
  const resource = maker()
  const topics = resource.topics.map(topic => topic.name)
  return {
    _id:     `id_String${casual.random}`,
    _source: { ...resource, topics }
  }
}

const TEST_SEARCH_PAGE_SIZE = 4
export const makeSearchResponse = (
  pageSize: number = TEST_SEARCH_PAGE_SIZE,
  total: number = 2 * TEST_SEARCH_PAGE_SIZE,
  type?: MakeableResultType,
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

export const makeUserListItem: Factory<UserListItem> = overrides => {
  const content = makeLearningResource()
  const item: UserListItem = {
    id:           faker.unique(faker.datatype.number),
    object_id:    content.id,
    position:     faker.datatype.number(),
    content_type: content.object_type,
    content_data: content,
    ...overrides
  }
  return item
}

export const makeUserListItemsPaginated = makePaginatedFactory(makeUserListItem)

export const makeUserListsPaginated = makePaginatedFactory(makeUserList)

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

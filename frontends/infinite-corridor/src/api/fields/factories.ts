import { faker } from "@faker-js/faker"
import * as R from "ramda"
import { makePaginatedFactory, Factory } from "ol-util"
import { LearningResourceType, factories } from "ol-search-ui"
import type { FieldChannel, UserList, UserListItem } from "./interfaces"

export const makeUserList: Factory<UserList> = overrides => {
  const userList: UserList = {
    id:                faker.unique(faker.datatype.number),
    short_description: faker.lorem.paragraph(),
    offered_by:        [],
    title:             faker.lorem.words(),
    topics:            R.times(() => factories.makeTopic(), 2),
    is_favorite:       faker.datatype.boolean(),
    image_src:         new URL(faker.internet.url()).toString(),
    image_description: faker.helpers.arrayElement([
      null,
      faker.lorem.sentence()
    ]),
    item_count:    faker.datatype.number({ min: 2, max: 5 }),
    object_type:   LearningResourceType.Userlist,
    list_type:     "userlist",
    privacy_level: "public",
    author:        faker.datatype.number({ min: 1, max: 1000 }),
    lists:         [],
    author_name:   faker.name.findName(),
    ...overrides
  }
  return userList
}

export const makeUserListItem: Factory<UserListItem> = overrides => {
  const content = factories.makeLearningResource()
  const item: UserListItem = {
    id:           faker.unique(faker.datatype.number),
    is_favorite:  faker.datatype.boolean(),
    object_id:    content.id,
    position:     faker.datatype.number(),
    program:      faker.datatype.number(),
    content_type: content.object_type,
    content_data: content,
    ...overrides
  }
  return item
}

const makeField: Factory<FieldChannel> = overrides => ({
  name:               faker.unique(faker.lorem.slug),
  title:              faker.lorem.words(faker.datatype.number({ min: 1, max: 4 })),
  public_description: faker.lorem.paragraph(),
  // standardize the url strings to match what browser puts on elements.
  banner:             new URL(faker.internet.url()).toString(),
  avatar_small:       new URL(faker.internet.url()).toString(),
  avatar_medium:      new URL(faker.internet.url()).toString(),
  avatar:             new URL(faker.internet.url()).toString(),
  featured_list:      makeUserList(),
  lists:              [makeUserList(), makeUserList()],
  is_moderator:       faker.datatype.boolean(),
  widget_list:        faker.datatype.number(),
  ...overrides
})

const makeFieldsPaginated = makePaginatedFactory(makeField)

const makeUserListItemsPaginated = makePaginatedFactory(makeUserListItem)

const makeUserListsPaginated = makePaginatedFactory(makeUserList)

export {
  makeField,
  makeFieldsPaginated,
  makeUserListItemsPaginated,
  makeUserListsPaginated
}

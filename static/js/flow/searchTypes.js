// @flow
import type {CoursePrice, PostType} from './discussionTypes'

type ResultCommon = {
  author_avatar_small: string,
  author_headline:     ?string,
  author_id:           string,
  author_name:         string,
}

type RESULT_TYPE_PROFILE = "profile"

export type ProfileResult = ResultCommon & {
  object_type:          RESULT_TYPE_PROFILE,
  author_bio:           ?string,
  author_avatar_medium: string,
}

type RESULT_TYPE_COMMENT = "comment"

export type CommentResult = ResultCommon & {
  channel_name:      string,
  channel_title:     string,
  comment_id:        string,
  created:           string,
  deleted:           boolean,
  object_type:       RESULT_TYPE_COMMENT,
  parent_comment_id: ?string,
  post_id:           string,
  post_slug:         string,
  post_title:        string,
  removed:           boolean,
  score:             number,
  text:              string,
}

type RESULT_TYPE_POST = "post"

export type PostResult = ResultCommon & {
  article_content:     ?Array<Object>,
  plain_text:          ?string,
  channel_name:        string,
  channel_title:       string,
  created:             string,
  deleted:             boolean,
  object_type:         RESULT_TYPE_POST,
  num_comments:        number,
  post_id:             string,
  post_link_url:       ?string,
  post_link_thumbnail: ?string,
  post_slug:           string,
  post_title:          string,
  post_type:           PostType,
  removed:             boolean,
  score:               number,
  text:                string,
  post_cover_image:    ?string
}

type RESULT_TYPE_COURSE = "course"

export type CourseResult = {
  id:                 number,
  course_id:          string,
  url:                string,
  title:              string,
  image_src:          ?string,
  object_type:        RESULT_TYPE_COURSE,
  short_description:  ?string,
  full_description:   ?string,
  platform:           string,
  language:           ?string,
  semester:           ?string,
  year:               ?string,
  level:              ?string,
  start_date:         ?string,
  end_date:           ?string,
  enrollment_start:   ?string,
  enrollment_end:     ?string,
  availability:       ?string,
  instructors:        Array<string>,
  topics:             Array<string>,
  prices:             Array<CoursePrice>
}

type RESULT_TYPE_BOOTCAMP = "bootcamp"

export type BootcampResult = {
  id:                 number,
  course_id:          string,
  url:                string,
  title:              string,
  image_src:          ?string,
  object_type:        RESULT_TYPE_BOOTCAMP,
  short_description:  ?string,
  full_description:   ?string,
  language:           ?string,
  year:               ?string,
  start_date:         ?string,
  end_date:           ?string,
  enrollment_start:   ?string,
  enrollment_end:     ?string,
  availability:       ?string,
  instructors:        Array<string>,
  topics:             Array<string>,
  prices:             Array<CoursePrice>
}

export type FacetBucket = {
  key:       string,
  doc_count: number
}

export type FacetResult = {
  buckets:    Array<FacetBucket>
}

export type CurrentFacet = {
  group: string,
  result: FacetResult
}

export type Result = PostResult | CommentResult | ProfileResult | CourseResult | BootcampResult

export type SearchInputs = {
  text?:            string,
  type?:            string,
  incremental:      boolean
}

export type SortParam = {
  field: string,
  option: string | Object
}

export type SearchParams = {
  type:              ?string|?Array<string>,
  text:              ?string,
  from:              number,
  size:              number,
  channelName:       ?string,
  facets?:           Map<string, Array<string>>,
  sort?:             SortParam,
}

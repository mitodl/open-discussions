// @flow
import {
  LINK_TYPE_TEXT,
  LINK_TYPE_LINK,
  LINK_TYPE_ARTICLE
} from "../lib/channels"

import type { LinkType, ChannelType } from "../lib/channels"
import {
  POSTS_OBJECT_TYPE,
  COMMENTS_OBJECT_TYPE,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_VIDEO,
  LR_TYPE_USERLIST,
  LR_TYPE_PODCAST,
  LR_TYPE_PODCAST_EPISODE
} from "../lib/constants"

export type FormImage = {
  edit:  Blob,
  image: File
}

export type Channel = {
  name:                  string,
  title:                 string,
  public_description:    string,
  channel_type:          ChannelType,
  num_users:             number,
  user_is_contributor:   boolean,
  user_is_moderator:     boolean,
  user_is_subscriber:    boolean,
  membership_is_managed: boolean,
  ga_tracking_id:        ?string,
  avatar:                string|null,
  avatar_small:          string|null,
  avatar_medium:         string|null,
  banner:                string|null,
  widget_list_id:        ?number,
  allowed_post_types:    Array<LinkType>,
  about:                 ?Array<Object>,
  moderator_notifications?: boolean,
}

export type ChannelForm = {
  name:                     string,
  title:                    string,
  public_description:       string,
  channel_type:             ChannelType,
  allowed_post_types:       Array<LinkType>,
  membership_is_managed:    boolean,
  avatar?:                  FormImage,
  banner?:                  FormImage,
  moderator_notifications?: boolean,
  ga_tracking_id?:          ?string,
}

export type ChannelAppearanceEditValidation = {
  title:              string,
  public_description: string
}

export type ChannelBasicEditValidation = {
  allowed_post_types: string,
  ga_tracking_id?:    string
}

export type AddMemberForm = {
  email: string,
}

export type AuthoredContent = {
  id:              string,
  author_id:       string,
  score:           number,
  upvoted:         boolean,
  created:         string,
  profile_image:   string,
  author_name:     string,
  author_headline: ?string,
  edited:          boolean,
  num_reports:     ?number,
  ignore_reports?: boolean,
  subscribed:      boolean
}

export type PostType =
  | typeof LINK_TYPE_LINK
  | typeof LINK_TYPE_TEXT
  | typeof LINK_TYPE_ARTICLE


export type Post = AuthoredContent & {
  title:           string,
  url:             ?string,
  text:            ?string,
  article_content: ?Array<Object>,
  plain_text:      ?string,
  slug:            string,
  num_comments:    number,
  channel_name:    string,
  channel_title:   string,
  stickied:        boolean,
  removed:         boolean,
  thumbnail:       ?string,
  post_type:       PostType,
  cover_image:     ?string
}

export type PostFormType =
  | typeof LINK_TYPE_LINK
  | typeof LINK_TYPE_TEXT
  | typeof LINK_TYPE_ARTICLE
  | null

export type PostForm = {
  postType:         PostFormType,
  post_type?:       PostFormType,
  text:             string,
  url:              string,
  title:            string,
  article_content:  Array<Object>,
  cover_image:      ?File,
  show_cover_image: boolean
}

export type PostValidation = {
  text?:            string,
  url?:             string,
  title?:           string,
  channel?:         string,
  post_type?:       string,
  article_content?: string,
  coverImage?:      string,
}

export type CreatePostPayload = {
  url?:             string,
  text?:            string,
  title:            string,
  article_content?: Array<Object>,
  cover_image?:     ?File,
}

export type PostListPagination = {
  after?:        string,
  after_count?:  number,
  before?:       string,
  before_count?: number,
  sort:          string,
}

export type PostListPaginationParams = {
  before: ?string,
  after:  ?string,
  count:  ?number
}

export type PostListData = {
  pagination: PostListPagination | null,
  postIds:    Array<string>
}

export type PostListResponse = {
  pagination: PostListPagination,
  posts:      Array<Post>
}

export type UserContributionResponse = {
  pagination: PostListPagination,
  [POSTS_OBJECT_TYPE | COMMENTS_OBJECT_TYPE]: Array<Post | CommentFromAPI>
}

type HasParentId = {
  parent_id: ?string
}

export type MoreCommentsFromAPI = HasParentId & {
  post_id:      string,
  children:     Array<string>,
  comment_type: "more_comments"
}

export type CommentFromAPI = AuthoredContent &
  HasParentId & {
    post_id:      string,
    text:         string,
    downvoted:    boolean,
    removed:      boolean,
    deleted:      boolean,
    comment_type: "comment"
  }

export type CommentInTree = CommentFromAPI & {
  replies: Array<GenericComment>
}

export type MoreCommentsInTree = MoreCommentsFromAPI

// Represents a comment serialized from a user's comment feed rather than from a post
export type UserFeedComment = CommentFromAPI & {
  post_slug: string
}

export type CommentFormType = {
  post_id:     string,
  comment_id?: string,
  text:        string
}

// If you're looking for a 'Comment' type this is probably what you want.
// It represents any element in the comment tree stored in the reducer
export type GenericComment = CommentInTree | MoreCommentsInTree

// This is not a data structure from the API, this is for the payload of the action updating the tree in the reducer
export type ReplaceMoreCommentsPayload = {
  comments: Array<CommentFromAPI | MoreCommentsFromAPI>,
  parentId: string,
  postId:   string
}

// The optional fields here are shown only to other moderators
export type Moderator = {
  moderator_name: string,
  email?:         string,
  full_name?:     string,
  can_remove?:    boolean
}

export type ChannelModerators = Array<Moderator>

export type Contributor = {
  contributor_name: string,
  email:            string,
  full_name:        string
}

export type ChannelContributors = Array<Contributor>

export type Subscriber = {
  subscriber_name: string
}

export type ChannelSubscribers = Array<Subscriber>

export type Member = Contributor | Moderator

export type ChannelInvitation = {
  id:         number,
  email:      string,
  created_on: string,
  updated_on: string,
}

export type ChannelInvites = Array<ChannelInvitation>

export type Report = {
  reason: string
}

export type CommentReport = Report & {
  reportType: "comment",
  commentId:  string
}

export type PostReport = Report & {
  reportType: "post",
  postId:     string
}

export type GenericReport = PostReport | CommentReport

export type ReportValidation = {
  reason: string
}

export type PostReportRecord = {
  post:    Post,
  comment: null,
  reasons: Array<string>
}

export type CommentReportRecord = {
  comment: CommentFromAPI,
  post:    null,
  reasons: Array<string>
}

export type ReportRecord = PostReportRecord | CommentReportRecord

export type Profile = {
  name:                 string,
  image:                ?string,
  image_small:          ?string,
  image_medium:         ?string,
  image_file:           ?string,
  image_small_file:     ?string,
  image_medium_file:    ?string,
  bio:                  ?string,
  headline:             ?string,
  username:             string,
  profile_image_small:  string,
  profile_image_medium: string,
  user_websites?:       Array<UserWebsite>,
  placename?:           string,
  location?:            Object
}

export type UserWebsite = {
  id: number,
  url: string,
  site_type: string
}

export type ImageForm = {
  edit:  ?Blob,
  image: ?File
}

export type ProfileValidation = {
  name: string
}

export type ProfilePayload = {
  name:     string,
  bio:      ?string,
  headline: ?string
}

export type SocialAuth = {
  provider: string,
}

export type LearningResourceRef = {
  object_id: number,
  content_type: string
}


export type ListItemMember = {
  list_id: number,
  item_id: number,
} & LearningResourceRef

export type LearningResourceSummary = {
  id:                 number,
  title:              string,
  image_src:          ?string,
  platform:           ?string,
  topics:             Array<CourseTopic>,
  offered_by:         Array<string>,
  object_type:        string,
  runs:               Array<LearningResourceRun>,
  lists:              Array<ListItemMember>,
  is_favorite?:       boolean,
  audience:           Array<string>,
  certification:      Array<string>
}

export type LearningResourceRun = {
  id:                 number,
  language:           ?string,
  semester:           ?string,
  year:               ?string,
  level:              ?string,
  start_date:         ?string,
  end_date:           ?string,
  enrollment_start:   ?string,
  enrollment_end:     ?string,
  best_start_date:    ?string,
  best_end_date:      ?string,
  instructors:        Array<CourseInstructor>,
  prices:             Array<CoursePrice>,
  availability:       ?string,
  url:                ?string
}

export type LearningResource = {
  id:                 number,
  title:              string,
  image_src:          ?string,
  short_description:  ?string,
  topics:             Array<CourseTopic>,
  offered_by:         Array<string>,
  is_favorite:        boolean,
  object_type:        string,
  lists:              Array<ListItemMember>
}


export type Course = LearningResource & {
  course_id:          string,
  url:                ?string,
  platform:           string,
  runs:               Array<LearningResourceRun>,
  object_type:        LR_TYPE_COURSE
}

export type ListItem = {
  id:           number,
  is_favorite:  boolean,
  object_id:    number,
  position:     number,
  program:      number,
  content_type: string,
  content_data: Object
}


export type UserListItemEdit = {
  id?:           number,
  object_id?:    number,
  position?:     number,
  content_type?: string,
  delete?:       boolean
}


export type Program = LearningResource & {
  image_src:          ?string,
  image_description:  ?string,
  url:                ?string,
  items:              Array<ListItem>,
  runs:               Array<LearningResourceRun>,
  object_type:        LR_TYPE_PROGRAM
}

export type UserList = LearningResource & {
  image_src:          ?string,
  image_description:  ?string,
  topics:             Array<CourseTopic>,
  list_type:          string,
  object_type:        LR_TYPE_USERLIST | LR_TYPE_LEARNINGPATH,
  privacy_level:      string,
  author:             number,
  author_name:        string,
  item_count:         number
}

export type Video = LearningResource & {
  image_src:          ?string,
  object_type:        LR_TYPE_VIDEO,
  url:                ?string,
  duration:           ?string,
  last_updated:       ?string
}

export type Podcast = LearningResource & {
  image_src:          ?string,
  object_type:        LR_TYPE_PODCAST,
  url:                ?string,
  last_updated:       ?string
}


export type PodcastEpisode = LearningResource & {
  image_src:          ?string,
  object_type:        LR_TYPE_PODCAST_EPISODE,
  url:                ?string,
  last_updated:       ?string
}

export type CoursePrice = {
  price: number,
  mode: string
}

export type CourseTopic = {
  id?:   number,
  name: string
}

export type CourseInstructor = {
  first_name: ?string,
  last_name: ?string,
  full_name: ?string,
}

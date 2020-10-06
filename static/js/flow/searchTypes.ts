
import { CourseInstructor, CoursePrice, ListItemMember, PostType } from "./discussionTypes";

type ResultCommon = {
  author_avatar_small: string;
  author_headline: string | null | undefined;
  author_id: string;
  author_name: string;
};

type RESULT_TYPE_PROFILE = "profile";

export type ProfileResult = ResultCommon & {
  object_type: RESULT_TYPE_PROFILE;
  author_bio: string | null | undefined;
  author_avatar_medium: string;
};

type RESULT_TYPE_COMMENT = "comment";

export type CommentResult = ResultCommon & {
  channel_name: string;
  channel_title: string;
  comment_id: string;
  created: string;
  deleted: boolean;
  object_type: RESULT_TYPE_COMMENT;
  parent_comment_id: string | null | undefined;
  post_id: string;
  post_slug: string;
  post_title: string;
  removed: boolean;
  score: number;
  text: string;
};

type RESULT_TYPE_POST = "post";

export type PostResult = ResultCommon & {
  article_content: Array<Object> | null | undefined;
  plain_text: string | null | undefined;
  channel_name: string;
  channel_title: string;
  created: string;
  deleted: boolean;
  object_type: RESULT_TYPE_POST;
  num_comments: number;
  post_id: string;
  post_link_url: string | null | undefined;
  post_link_thumbnail: string | null | undefined;
  post_slug: string;
  post_title: string;
  post_type: PostType;
  removed: boolean;
  score: number;
  text: string;
  post_cover_image: string | null | undefined;
};

export type LearningResourceRun = {
  id: number;
  url?: string | null | undefined;
  language?: string | null | undefined;
  semester?: string | null | undefined;
  year?: string | null | undefined;
  level?: string | null | undefined;
  start_date?: string | null | undefined;
  end_date?: string | null | undefined;
  enrollment_start?: string | null | undefined;
  enrollment_end?: string | null | undefined;
  best_start_date?: string | null | undefined;
  best_end_date?: string | null | undefined;
  availability?: string | null | undefined;
  instructors: Array<CourseInstructor>;
  prices: Array<CoursePrice>;
};

export type LearningResourceResult = {
  id: number;
  course_id?: string;
  url?: string;
  title: string;
  image_src: string | null | undefined;
  object_type: string;
  offered_by?: Array<string>;
  short_description?: string | null | undefined;
  full_description?: string | null | undefined;
  platform?: string;
  topics: Array<string>;
  runs: Array<LearningResourceRun>;
  lists: Array<ListItemMember>;
  is_favorite: boolean;
  certification: Array<string>;
  audience: Array<string>;
};


export type FacetBucket = {
  key: string;
  doc_count: number;
};

export type FacetResult = {
  buckets: Array<FacetBucket>;
};

export type Result = PostResult | CommentResult | ProfileResult | LearningResourceResult;

export type SearchInputs = {
  text?: string;
  type?: string;
  incremental: boolean;
};

export type SortParam = {
  field: string;
  option: string | Object;
};

export type SearchParams = {
  type?: (string | null | undefined) | (Array<string> | null | undefined);
  text?: string | null | undefined;
  from?: number;
  size?: number;
  channelName?: string | null | undefined;
  facets?: Map<string, Array<string>>;
  sort?: SortParam;
};
export type LearningResourceSummary = {
  id: number
  title: string
  image_src: string | null
  platform: string | null | undefined
  topics: CourseTopic[]
  offered_by: string[]
  object_type: string
  runs: LearningResourceRun[]
  lists: ListItemMember[]
  is_favorite?: boolean
  audience: string[]
  certification: string[]
}

export type LearningResourceResult = {
  id: number
  course_id?: string
  url?: string
  title: string
  image_src: string | null
  object_type: string
  offered_by?: string[]
  short_description?: string | null
  full_description?: string | null
  platform?: string
  topics: string[]
  runs: LearningResourceRun[]
  lists: ListItemMember[]
  is_favorite: boolean
  certification: string[]
  audience: string[]
}

export type CourseTopic = {
  id?: number
  name: string
}

export type LearningResourceRun = {
  id: number
  language: string | null
  semester: string | null
  year: string | null
  level: string | null
  start_date: string | null
  end_date: string | null
  enrollment_start: string | null
  enrollment_end: string | null
  best_start_date: string | null
  best_end_date: string | null
  instructors: CourseInstructor[]
  prices: CoursePrice[]
  availability: string | null
  url: string | null
}

export type LearningResourceRef = {
  object_id: number
  content_type: string
}

export type ListItemMember = {
  list_id: number
  item_id: number
} & LearningResourceRef

export type CoursePrice = {
  price: number
  mode: string
}

export type CourseInstructor = {
  first_name: string | null
  last_name: string | null
  full_name: string | null
}

export const LR_TYPE_COURSE = "course"
export const LR_TYPE_PROGRAM = "program"
export const LR_TYPE_USERLIST = "userlist"
export const LR_TYPE_LEARNINGPATH = "learningpath"
export const LR_TYPE_VIDEO = "video"
export const LR_TYPE_PODCAST = "podcast"
export const LR_TYPE_PODCAST_EPISODE = "podcastepisode"
export const FAVORITES_PSEUDO_LIST = "favorites"

export const readableLearningResources: { [key: string]: string } = {
  [LR_TYPE_COURSE]:          "Course",
  [LR_TYPE_PROGRAM]:         "Program",
  [LR_TYPE_USERLIST]:        "Learning List",
  [LR_TYPE_LEARNINGPATH]:    "Learning Path",
  [LR_TYPE_VIDEO]:           "Video",
  [FAVORITES_PSEUDO_LIST]:   "Favorites",
  [LR_TYPE_PODCAST]:         "Podcast",
  [LR_TYPE_PODCAST_EPISODE]: "Podcast Episode"
}

type overrideObjectProps = {
  id?: number
  title?: string
  image_src?: string | null
  platform?: string | null
  topics?: CourseTopic[]
  offered_by?: string[]
  object_type?: string
  runs?: LearningResourceRun[]
  lists?: ListItemMember[]
  is_favorite?: boolean
  audience?: string[]
  certification?: string[]
}
export const searchResultToLearningResource = (
  result: LearningResourceResult,
  overrideObject: overrideObjectProps = {}
): LearningResourceSummary => ({
  id:            result.id,
  title:         result.title,
  image_src:     result.image_src,
  object_type:   result.object_type,
  lists:         result.lists,
  is_favorite:   result.is_favorite,
  offered_by:    result.offered_by ?? [],
  platform:      "platform" in result ? result.platform : null,
  topics:        result.topics ? result.topics.map(topic => ({ name: topic })) : [],
  runs:          "runs" in result ? result.runs : [],
  audience:      result.audience,
  certification: result.certification,
  ...overrideObject
})

export type LearningResource = Pick<
  LearningResourceResult,
  | "id"
  | "image_src"
  | "is_favorite"
  | "lists"
  | "object_type"
  | "offered_by"
  | "short_description"
  | "title"
> & { topics: CourseTopic[] }

export type UserList = LearningResource & {
  image_src: string | null | undefined
  image_description: string | null | undefined
  topics: CourseTopic[]
  list_type: string
  object_type: typeof LR_TYPE_USERLIST | typeof LR_TYPE_LEARNINGPATH
  privacy_level: string
  author: number
  author_name: string
  item_count: number
}

export type UserListItem = {
  id: number
  is_favorite: boolean
  object_id: number
  position: number
  program: number
  content_type: string
  content_data: LearningResourceSummary
}

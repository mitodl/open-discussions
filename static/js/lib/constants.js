export const contentLoaderSpeed = 2

export const PERSONAL_SITE_TYPE = "personal"
export const SOCIAL_SITE_TYPE = "social"

export const POSTS_OBJECT_TYPE = "posts"
export const COMMENTS_OBJECT_TYPE = "comments"

export const COURSE_CURRENT = "Current"
export const COURSE_AVAILABLE_NOW = "Available Now"
export const COURSE_ARCHIVED = "Archived"
export const COURSE_PRIOR = "Prior"

const ocwPlatform = "ocw"
const edxPlatform = "mitx"
const bootcampsPlatform = "bootcamps"
const micromastersPlatform = "micromasters"

export const platforms = {
  OCW:          ocwPlatform,
  edX:          edxPlatform,
  bootcamps:    bootcampsPlatform,
  micromasters: micromastersPlatform
}

export const platformLogoUrls = {
  [ocwPlatform]:          "/static/images/mit-ocw-logo-square.png",
  [edxPlatform]:          "/static/images/mitx-logo.png",
  [bootcampsPlatform]:    "/static/images/mit-bootcamp-logo.png",
  [micromastersPlatform]: "/static/images/mit-micromasters-logo.png",
  "":                     "/static/images/blank.png"
}

export const platformReadableNames = {
  [ocwPlatform]:          "MIT OpenCourseWare",
  [edxPlatform]:          "edX",
  [bootcampsPlatform]:    "MIT Bootcamp",
  [micromastersPlatform]: "MIT MicroMasters"
}

export const WIDGET_TYPE_MARKDOWN = "Markdown"
export const WIDGET_TYPE_RSS = "RSS Feed"
export const WIDGET_TYPE_URL = "URL"
export const WIDGET_TYPE_PEOPLE = "People"

export const WIDGET_FIELD_TYPE_NUMBER = "number"
export const WIDGET_FIELD_TYPE_TEXT = "text"
export const WIDGET_FIELD_TYPE_TEXTAREA = "textarea"
export const WIDGET_FIELD_TYPE_URL = "url"
export const WIDGET_FIELD_TYPE_MARKDOWN = "markdown_wysiwyg"
export const WIDGET_FIELD_TYPE_PEOPLE = "people"
export const WIDGET_FIELD_TYPE_CHECKBOX = "checkbox"

export const CAROUSEL_PAGE_SIZE = 3
export const CAROUSEL_IMG_HEIGHT = 130
export const CAROUSEL_IMG_WIDTH = 306

export const LR_TYPE_COURSE = "course"
export const LR_TYPE_BOOTCAMP = "bootcamp"
export const LR_TYPE_PROGRAM = "program"
export const LR_TYPE_USERLIST = "user_list"
export const LR_TYPE_ALL = [
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST
]

export const readableLearningResources = {
  [LR_TYPE_COURSE]:   "Course",
  [LR_TYPE_BOOTCAMP]: "Bootcamp",
  [LR_TYPE_PROGRAM]:  "Program",
  [LR_TYPE_USERLIST]: "Learning Path"
}

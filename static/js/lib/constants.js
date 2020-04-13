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
const xproPlatform = "xpro"
const youtubePlatform = "youtube"
const ollPlatform = "oll"
const seePlatform = "see"
const mitpePlatform = "mitpe"
const csailPlatform = "csail"

export const platforms = {
  OCW:          ocwPlatform,
  edX:          edxPlatform,
  bootcamps:    bootcampsPlatform,
  micromasters: micromastersPlatform,
  xpro:         xproPlatform,
  youtube:      youtubePlatform,
  oll:          ollPlatform,
  see:          seePlatform,
  mitpe:        mitpePlatform,
  csail:        csailPlatform
}

export const platformLogos = {
  [ocwPlatform]:          "/static/images//mit-ocw-logo-square.png",
  [edxPlatform]:          "/static/images/edx_logo.png",
  [bootcampsPlatform]:    "/static/images/mit-bootcamp-logo.png",
  [micromastersPlatform]: "/static/images/mit-micromasters-logo.png",
  [xproPlatform]:         "/static/images/mit-xpro-logo.png",
  [ollPlatform]:          "/static/images/oll_logo.png",
  [seePlatform]:          "/static/images/sloan-logo.png",
  [mitpePlatform]:        "/static/images/mitpe-logo.png",
  [csailPlatform]:        "/static/images/csail-logo.png"
}

export const offeredBys = {
  ocw:          "OCW",
  micromasters: "MicroMasters",
  bootcamps:    "Bootcamps",
  mitx:         "MITx",
  xpro:         "xPro",
  see:          "Sloan",
  mitpe:        "Professional",
  csail:        "CSAIL"
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

export const CAROUSEL_IMG_HEIGHT = 130
export const CAROUSEL_IMG_WIDTH = 306

export const LR_TYPE_COURSE = "course"
export const LR_TYPE_BOOTCAMP = "bootcamp"
export const LR_TYPE_PROGRAM = "program"
export const LR_TYPE_USERLIST = "userlist"
export const LR_TYPE_LEARNINGPATH = "learningpath"
export const LR_TYPE_VIDEO = "video"
export const FAVORITES_PSEUDO_LIST = "favorites"
export const LR_TYPE_ALL = [
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_VIDEO
]

export const OBJECT_TYPE_MAPPING = {
  [LR_TYPE_COURSE]:       LR_TYPE_COURSE,
  [LR_TYPE_BOOTCAMP]:     LR_TYPE_BOOTCAMP,
  [LR_TYPE_PROGRAM]:      LR_TYPE_PROGRAM,
  [LR_TYPE_USERLIST]:     LR_TYPE_USERLIST,
  [LR_TYPE_LEARNINGPATH]: LR_TYPE_USERLIST,
  [LR_TYPE_VIDEO]:        LR_TYPE_VIDEO
}

export const readableLearningResources = {
  [LR_TYPE_COURSE]:        "Course",
  [LR_TYPE_BOOTCAMP]:      "Bootcamp",
  [LR_TYPE_PROGRAM]:       "Program",
  [LR_TYPE_USERLIST]:      "Learning List",
  [LR_TYPE_LEARNINGPATH]:  "Learning Path",
  [LR_TYPE_VIDEO]:         "Video",
  [FAVORITES_PSEUDO_LIST]: "Favorites"
}

export const DATE_FORMAT = "YYYY-MM-DD[T]HH:mm:ss[Z]"
export const DEFAULT_START_DT = "1970-01-01T00:00:00Z"
export const DEFAULT_END_DT = "2500-01-01T23:59:59Z"

export const PHONE = "PHONE"
export const TABLET = "TABLET"
export const DESKTOP = "DESKTOP"
export const PHONE_WIDTH = 580
export const TABLET_WIDTH = 839

export const LR_PUBLIC = "public"
export const LR_PRIVATE = "private"

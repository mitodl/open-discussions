import colorTheme from "./colors"
import mediaTheme from "./media"
import type { ColorTheme } from "./colors"
import type { MediaTheme } from "./media"

interface CombinedTheme extends ColorTheme, MediaTheme {}

const combinedTheme: CombinedTheme = {
  ...colorTheme,
  ...mediaTheme
}

export { combinedTheme }
export type { CombinedTheme }

type Color = "fontGreyMid" | "cardBackground"

type ColorTheme = {
  color: Record<Color, string>
}

const colorTheme: ColorTheme = {
  color: {
    fontGreyMid: "var(--font-grey-mid)",
    cardBackground: "var(--card-background)",
  },
}

export default colorTheme
export type { ColorTheme }

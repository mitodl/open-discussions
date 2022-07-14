type Color = "fontGreyMid"

type ColorTheme = {
  color: Record<Color, string>
}

const colorTheme: ColorTheme = {
  color: {
    fontGreyMid: "var(--font-grey-mid)",
  },
}

export default colorTheme
export type { ColorTheme }

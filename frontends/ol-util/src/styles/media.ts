type MediaType =
  | "desktop"
  | "desktopWide"
  | "extraWide"
  | "mobile"
  | "phone"
  | "materialMobile"

type MediaTheme = {
  /**
   * Provides media query breakpoints.
   *
   * Use with styled components, e.g.,
   * ```ts
   * const ForExample = styled.div`
   *   ${{ theme } => theme.media.desktop} {
   *     height: 500px;
   *   }
   *   ${{ theme } => theme.media.mobile} {
   *     height: 250px;
   *   }
   * `
   * ```
   */
  media: Readonly<Record<MediaType, string>>
}

const mediaTheme: MediaTheme = {
  media: {
    desktop:        "@media (min-width: 801px)",
    desktopWide:    "@media (min-width: 1000px)",
    extraWide:      "@media (min-width: 1150px)",
    mobile:         "@media (max-width: 800px)",
    phone:          "@media (max-width: 580px)",
    materialMobile: "@media (max-width: 599px)"
  }
}

export default mediaTheme
export type { MediaTheme }

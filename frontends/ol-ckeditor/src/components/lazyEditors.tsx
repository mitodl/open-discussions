import React, { lazy, Suspense } from "react"
import type { CkeditorMarkdownProps } from "./CkeditorMarkdown"
import type { CkeditorArticleProps } from "./CkeditorArticle"
import LoadingText from "./LoadingText"

type OptionalFallback = {
  fallback?: React.ReactNode
}

const RawCKEditorMarkdownLazy = lazy(() => import("./CkeditorMarkdown"))

type CkeditorMarkdownLazyProps = CkeditorMarkdownProps & OptionalFallback

const CkeditorMarkdownLazy: React.FC<CkeditorMarkdownLazyProps> = ({
  fallback,
  ...others
}) => {
  return (
    <Suspense fallback={fallback ?? <LoadingText />}>
      <RawCKEditorMarkdownLazy {...others} />
    </Suspense>
  )
}

const RawCKEditorArticleLazy = lazy(() => import("./CkeditorArticle"))

type CkeditorArticleLazyProps = CkeditorArticleProps & OptionalFallback

const CkeditorArticleLazy: React.FC<CkeditorArticleLazyProps> = ({
  fallback,
  ...others
}) => {
  return (
    <Suspense fallback={fallback ?? <LoadingText />}>
      <RawCKEditorArticleLazy {...others} />
    </Suspense>
  )
}

export { CkeditorMarkdownLazy, CkeditorArticleLazy }
export type { CkeditorMarkdownLazyProps, CkeditorArticleLazyProps }

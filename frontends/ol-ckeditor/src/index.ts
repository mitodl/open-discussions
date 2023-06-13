/**
 * A TS project consuming this TS source code will try to typecheck this
 * package. Since CKEditor doesn't have great typing, it will fail unless it has
 * the ambients declarations in ./types/ckeditor.d.ts (or declares its own
 * CKEditor types).
 *
 * Eslint wants this to be an import, but there is no type-only version of a
 * sideffect import. So use old /// ts syntax. See https://github.com/microsoft/TypeScript/issues/36812
 */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./types/ckeditor.d.ts" />
export { default as CkeditorMarkdownLazy } from "./components/CkeditorMarkdownLazy"
export type { CkeditorMarkdownLazyProps } from "./components/CkeditorMarkdownLazy"

export { default as CkeditorArticle } from "./components/CkeditorArticle"
export type { CkeditorArticleProps } from "./components/CkeditorArticle"

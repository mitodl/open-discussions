// @flow
import Mailcheck from "mailcheck"

Mailcheck.defaultDomains.push("mit.edu")

export type EmailSuggestion = {
  full: string,
  domain: string,
  address: string
}

export const suggestEmail = (email: string): ?EmailSuggestion => {
  const result = Mailcheck.suggest(
    Mailcheck.encodeEmail(email),
    Mailcheck.defaultDomains,
    Mailcheck.secondLevelDomains,
    Mailcheck.topLevelDomains,
    Mailcheck.distanceFunction
  )
  if (!result || result.full === email) {
    return null
  }
  return result
}

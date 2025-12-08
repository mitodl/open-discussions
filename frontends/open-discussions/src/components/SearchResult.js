// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "./Card"
import { LearningResourceCard } from "./LearningResourceCard"
import ProfileImage, { PROFILE_IMAGE_SMALL } from "./ProfileImage"

import { searchResultToProfile } from "../lib/search"
import { profileURL } from "../lib/url"
import { LR_TYPE_ALL } from "../lib/constants"
import { useSearchResultToFavoriteLR } from "../hooks/learning_resources"

import type {
  LearningResourceResult,
  ProfileResult,
  Result
} from "../flow/searchTypes"

type ProfileProps = {
  result: ProfileResult
}
const ProfileSearchResult = ({ result }: ProfileProps) => {
  const profile = searchResultToProfile(result)
  return (
    <Card className="profile-search-result">
      <ProfileImage imageSize={PROFILE_IMAGE_SMALL} profile={profile} />
      <div>
        <Link to={profileURL(profile.username)} className="name navy">
          {result.author_name}
        </Link>
        <div className="headline">{result.author_headline}</div>
      </div>
    </Card>
  )
}

type LearningResourceProps = {
  result: LearningResourceResult,
  overrideObject?: Object,
  searchResultLayout?: string
}

const LearningResourceSearchResult = ({
  result,
  searchResultLayout
}: LearningResourceProps) => {
  // $FlowFixMe: this should only be used for courses
  const searchResultToFavoriteLR = useSearchResultToFavoriteLR()

  return (
    <LearningResourceCard
      object={searchResultToFavoriteLR(result)}
      searchResultLayout={searchResultLayout}
    />
  )
}

type Props = {
  result: Result,
  setShowResourceDrawer?: ({
    objectId: string,
    objectType: string,
    runId: ?number
  }) => void,
  searchResultLayout?: string
}
export default class SearchResult extends React.Component<Props> {
  render() {
    const { result, setShowResourceDrawer, searchResultLayout } = this.props
    if (result.object_type === "profile") {
      // $FlowFixMe: This will always be a Profile result
      return <ProfileSearchResult result={result} />
    } else if (LR_TYPE_ALL.includes(result.object_type)) {
      return (
        <LearningResourceSearchResult
          result={result}
          setShowResourceDrawer={setShowResourceDrawer}
          searchResultLayout={searchResultLayout}
        />
      )
    }
    return null
  }
}

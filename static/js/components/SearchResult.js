// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "./Card"
import CompactPostDisplay from "./CompactPostDisplay"
import CommentTree from "./CommentTree"
import ProfileImage, { PROFILE_IMAGE_SMALL } from "../containers/ProfileImage"

import {
  searchResultToComment,
  searchResultToPost,
  searchResultToProfile
} from "../lib/search"
import { commentPermalink, profileURL } from "../lib/url"
import { dropdownMenuFuncs } from "../lib/ui"

import type {
  CommentResult,
  PostResult,
  ProfileResult,
  Result
} from "../flow/searchTypes"

type PostProps = {
  result: PostResult
}
const PostSearchResult = ({ result }: PostProps) => (
  <CompactPostDisplay
    post={searchResultToPost(result)}
    isModerator={false}
    menuOpen={false}
  />
)

type CommentProps = {
  result: CommentResult
}
const CommentSearchResult = ({ result }: CommentProps) => {
  const comment = searchResultToComment(result)
  return (
    <CommentTree
      comments={[comment]}
      remove={() => undefined}
      approve={() => undefined}
      upvote={async () => undefined}
      downvote={async () => undefined}
      isModerator={false}
      isPrivateChannel={false}
      commentPermalink={commentPermalink(
        result.channel_name,
        result.post_id,
        result.post_slug
      )}
      curriedDropdownMenufunc={dropdownMenuFuncs(() => null)}
      dropdownMenus={new Set()}
    />
  )
}

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

type Props = {
  result: Result
}
export default class SearchResult extends React.Component<Props> {
  render() {
    const { result } = this.props
    if (result.object_type === "post") {
      return <PostSearchResult result={result} />
    } else if (result.object_type === "comment") {
      return <CommentSearchResult result={result} />
    } else if (result.object_type === "profile") {
      return <ProfileSearchResult result={result} />
    }
  }
}

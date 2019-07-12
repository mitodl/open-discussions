// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "./Card"
import CompactPostDisplay from "./CompactPostDisplay"
import LearningResourceCard from "./LearningResourceCard"
import CommentTree from "./CommentTree"
import ProfileImage, { PROFILE_IMAGE_SMALL } from "../containers/ProfileImage"

import {
  searchResultToComment,
  searchResultToLearningResource,
  searchResultToPost,
  searchResultToProfile
} from "../lib/search"
import { commentPermalink, profileURL } from "../lib/url"
import { dropdownMenuFuncs } from "../lib/ui"
import { LR_TYPE_COURSE, LR_TYPE_BOOTCAMP } from "../lib/constants"

import type {
  LearningResourceResult,
  ProfileResult,
  Result
} from "../flow/searchTypes"
import type { CommentInTree, Post } from "../flow/discussionTypes"

type PostProps = {
  post: Post,
  toggleUpvote?: Function
}
const PostSearchResult = ({ post, toggleUpvote }: PostProps) => (
  <CompactPostDisplay
    post={post}
    isModerator={false}
    menuOpen={false}
    useSearchPageUI
    toggleUpvote={toggleUpvote}
  />
)

type CommentProps = {
  comment: CommentInTree,
  downvote?: Function,
  upvote?: Function,
  channel: string,
  slug: string
}
const CommentSearchResult = ({
  comment,
  upvote,
  downvote,
  channel,
  slug
}: CommentProps) => {
  return (
    <CommentTree
      comments={[comment]}
      remove={() => undefined}
      approve={() => undefined}
      upvote={upvote}
      downvote={downvote}
      isModerator={false}
      isPrivateChannel={false}
      commentPermalink={commentPermalink(channel, comment.post_id, slug)}
      curriedDropdownMenufunc={dropdownMenuFuncs(() => null)}
      dropdownMenus={new Set()}
      useSearchPageUI
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

type LearningResourceProps = {
  result: LearningResourceResult,
  toggleFacet?: Function,
  setShowResourceDrawer?: ({ objectId: string, objectType: string }) => void,
  overrideObject?: Object
}

const LearningResourceSearchResult = ({
  result,
  toggleFacet,
  setShowResourceDrawer,
  overrideObject
}: LearningResourceProps) => {
  // $FlowFixMe: this should only be used for courses

  return (
    <LearningResourceCard
      object={searchResultToLearningResource(result, overrideObject)}
      toggleFacet={toggleFacet}
      setShowResourceDrawer={setShowResourceDrawer}
    />
  )
}

type Props = {
  commentUpvote?: Function,
  commentDownvote?: Function,
  result: Result,
  toggleUpvote?: Post => void,
  upvotedPost?: ?Post,
  votedComment?: ?CommentInTree,
  toggleFacet?: Function,
  setShowResourceDrawer?: ({ objectId: string, objectType: string }) => void,
  overrideObject?: Object
}
export default class SearchResult extends React.Component<Props> {
  render() {
    const {
      result,
      toggleUpvote,
      upvotedPost,
      votedComment,
      commentUpvote,
      commentDownvote,
      toggleFacet,
      setShowResourceDrawer,
      overrideObject
    } = this.props
    if (result.object_type === "post") {
      // $FlowFixMe: This will always be a PostResult
      const post = upvotedPost || searchResultToPost(result)
      return <PostSearchResult post={post} toggleUpvote={toggleUpvote} />
    } else if (result.object_type === "comment") {
      // $FlowFixMe: This will always be a Comment result
      let comment = searchResultToComment(result)
      if (votedComment) {
        comment = {
          ...comment,
          upvoted:   votedComment.upvoted,
          downvoted: votedComment.downvoted,
          score:     votedComment.score
        }
      }
      return (
        <CommentSearchResult
          comment={comment}
          upvote={commentUpvote}
          downvote={commentDownvote}
          // $FlowFixMe: This will always be a Comment result
          channel={result.channel_name}
          // $FlowFixMe: This will always be a Comment result
          slug={result.post_slug}
        />
      )
    } else if (result.object_type === "profile") {
      // $FlowFixMe: This will always be a Profile result
      return <ProfileSearchResult result={result} />
    } else if (
      [LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].includes(result.object_type)
    ) {
      return (
        <LearningResourceSearchResult
          result={result}
          toggleFacet={toggleFacet}
          setShowResourceDrawer={setShowResourceDrawer}
          overrideObject={overrideObject}
        />
      )
    }
    return null
  }
}

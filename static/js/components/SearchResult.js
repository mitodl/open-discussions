// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "./Card"
import CompactPostDisplay from "./CompactPostDisplay"
import CourseCard from "./CourseCard"
import BootcampCard from "./BootcampCard"
import CommentTree from "./CommentTree"
import ProfileImage, { PROFILE_IMAGE_SMALL } from "../containers/ProfileImage"

import {
  searchResultToBootcamp,
  searchResultToComment,
  searchResultToCourse,
  searchResultToPost,
  searchResultToProfile
} from "../lib/search"
import { commentPermalink, profileURL } from "../lib/url"
import { dropdownMenuFuncs } from "../lib/ui"

import type {
  BootcampResult,
  CourseResult,
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
  result: CourseResult | BootcampResult,
  toggleFacet?: Function,
  setShowLearningResourceDrawer?: ({objectId: string,  objectType: string }) => void
}


const CourseSearchResult = ({ result, toggleFacet, setShowLearningResourceDrawer}: LearningResourceProps) => {
  const course = searchResultToCourse(result)
  return (
    <CourseCard
      course={course}
      toggleFacet={toggleFacet}
      setShowLearningResourceDrawer={setShowLearningResourceDrawer}
    />
  )
}

const BootcampSearchResult = ({
  result,
  toggleFacet,
  setShowLearningResourceDrawer
}: LearningResourceProps) => {
  const bootcamp = searchResultToBootcamp(result)
  return (
    <BootcampCard
      bootcamp={bootcamp}
      toggleFacet={toggleFacet}
      setShowLearningResourceDrawer={setShowLearningResourceDrawer}/>
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
  setShowLearningResourceDrawer?: ({ courseId: string }) => void
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
      setShowLearningResourceDrawer
    } = this.props
    if (result.object_type === "post") {
      const post = upvotedPost || searchResultToPost(result)
      return <PostSearchResult post={post} toggleUpvote={toggleUpvote} />
    } else if (result.object_type === "comment") {
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
          channel={result.channel_name}
          slug={result.post_slug}
        />
      )
    } else if (result.object_type === "profile") {
      return <ProfileSearchResult result={result} />
    } else if (result.object_type === "course") {
      return (
        <CourseSearchResult
          result={result}
          toggleFacet={toggleFacet}
          setShowLearningDrawer={setShowLearningResourceDrawer}
        />
      )
    } else if (result.object_type === "bootcamp") {
      return <BootcampSearchResult result={result} toggleFacet={toggleFacet} />
    }
    return null
  }
}


import React from "react";

import CompactPostDisplay from "./CompactPostDisplay";

import { Post } from "../flow/discussionTypes";

type Props = {
  posts: Array<Post>;
  showChannelLinks: boolean;
  showPinUI: boolean;
  togglePinPost?: (post: Post) => Promise<any> | null | undefined;
  isModerator: boolean;
  reportPost?: (post: Post) => void | null | undefined;
  removePost?: (post: Post) => void | null | undefined;
  deletePost?: (post: Post) => void | null | undefined;
};

const PostList = ({
  posts,
  showChannelLinks,
  showPinUI,
  isModerator,
  togglePinPost,
  reportPost,
  removePost,
  deletePost
}: Props) => <div className="post-list">
    {posts.length > 0 ? posts.map((post, index) => <CompactPostDisplay post={post} key={index} showChannelLink={showChannelLinks} showPinUI={showPinUI} isModerator={isModerator} togglePinPost={togglePinPost} reportPost={reportPost} removePost={removePost} deletePost={deletePost} />) : <div className="empty-list-msg">There are no posts to display.</div>}
  </div>;

export default PostList;
/* global SETTINGS */
import React from "react"
import { storiesOf } from "@storybook/react"
import { action } from "@storybook/addon-actions"
import { withKnobs, text, boolean, number } from "@storybook/addon-knobs"
import { MemoryRouter } from "react-router"
import { Provider } from "react-redux"
import { createStoreWithMiddleware } from "../store/configureStore"
import casual from "casual-browserify"
import { SortableContainer } from "react-sortable-hoc"

import {
  editCommentKey,
  editPostKey,
  replyToCommentKey,
  ReplyToPostForm
} from "../components/CommentForms"
import { makeChannel } from "../factories/channels"
import { makeCommentsResponse, makeMoreComments } from "../factories/comments"
import { makePost } from "../factories/posts"
import {
  makeCommentResult,
  makePostResult,
  makeProfileResult
} from "../factories/search"
import {
  makeWidgetInstance,
  makeWidgetListResponse
} from "../factories/widgets"
import { CHANNEL_TYPE_PRIVATE, CHANNEL_TYPE_PUBLIC } from "../lib/channels"
import {
  WIDGET_TYPE_MARKDOWN,
  WIDGET_TYPE_RSS,
  WIDGET_TYPE_URL
} from "../lib/constants"
import { dropdownMenuFuncs } from "../lib/ui"
import { commentPermalink } from "../lib/url"
import { getWidgetKey } from "../lib/widgets"
import { createCommentTree } from "../reducers/comments"
import rootReducer from "../reducers"

import BackButton from "../components/BackButton"
import Card from "../components/Card"
import ChannelHeader from "../components/ChannelHeader"
import CloseButton from "../components/CloseButton"
import { CompactPostDisplay } from "../components/CompactPostDisplay"
import ExpandedPostDisplay from "../components/ExpandedPostDisplay"
import CommentTree, {
  commentDropdownKey,
  commentShareKey
} from "../components/CommentTree"
import {
  CommentSortPicker,
  PostSortPicker,
  SearchFilterPicker
} from "../components/Picker"
import SearchResult from "../components/SearchResult"
import SearchTextbox from "../components/SearchTextbox"
import WidgetInstance from "../components/widgets/WidgetInstance"
import WidgetList from "../components/widgets/WidgetList"

// delay import so fonts get applied first
setTimeout(() => {
  require("../../scss/layout.scss")
}, 100)

// Set up a reducer with two custom actions to wipe and replace all data
const RESET_STATE = "RESET_STATE"
const SET_NEW_STATE = "SET_NEW_STATE"
const reducer = (state, action) => {
  if (action.type === RESET_STATE) {
    state = undefined
  } else if (action.type === SET_NEW_STATE) {
    state = {
      ...state,
      ...action.payload
    }
  }

  return rootReducer(state, action)
}

// This needs to be created here. If it's defined in a method or decorator it will be recreated on each reload,
// which react-redux will complain about.
const store = createStoreWithMiddleware(reducer)

const setReducerState = newState => {
  store.dispatch({
    type:    SET_NEW_STATE,
    payload: newState
  })
}

const StoryWrapper = ({ children, style = {} }) => (
  <div style={{ width: "500px", margin: "50px auto", ...style }}>
    {children}
  </div>
)

const withSettings = story => {
  global.SETTINGS = {}
  return story()
}

const withRandom = story => {
  casual.seed(123)
  return story()
}

const withRedux = story => {
  store.dispatch({ type: RESET_STATE })
  return <Provider store={store}>{story()}</Provider>
}

const withRouter = story => <MemoryRouter>{story()}</MemoryRouter>

storiesOf("BackButton", module)
  .add("with a class name", () => (
    <StoryWrapper>
      <BackButton onClick={action("clicked")} className="foobarbaz" />
    </StoryWrapper>
  ))
  .add("with no class name", () => (
    <StoryWrapper>
      <BackButton onClick={action("clicked")} />
    </StoryWrapper>
  ))

storiesOf("Card", module)
  .addDecorator(withKnobs)
  .add("with title", () => {
    const title = text("Title", "My Great Card")

    return (
      <StoryWrapper>
        <Card title={title}>
          <p>some text</p>
        </Card>
      </StoryWrapper>
    )
  })
  .add("without a title", () => (
    <StoryWrapper>
      <Card>
        <p>some text</p>
      </Card>
    </StoryWrapper>
  ))

storiesOf("CloseButton", module).add("basic display", () => (
  <StoryWrapper style={{ position: "relative" }}>
    <CloseButton onClick={action("clicked")} />
  </StoryWrapper>
))

const textContentKnob = () => text("textContent", "click me!")
const urlKnob = () => text("url", "http://en.wikipedia.org/wiki/Elephant")

storiesOf("Links and Buttons", module)
  .addDecorator(withKnobs)
  .add("basic link", () => {
    const textContent = textContentKnob()
    const url = urlKnob()

    return (
      <StoryWrapper>
        <a href={url}>{textContent}</a>
      </StoryWrapper>
    )
  })
  .add("navy link", () => {
    const textContent = textContentKnob()
    const url = urlKnob()

    return (
      <StoryWrapper>
        <a className="navy" href={url}>
          {textContent}
        </a>
      </StoryWrapper>
    )
  })
  .add("grey link", () => {
    const textContent = textContentKnob()
    const url = urlKnob()

    return (
      <StoryWrapper>
        <a className="grey" href={url}>
          {textContent}
        </a>
      </StoryWrapper>
    )
  })
  .add("no-underline link", () => {
    const textContent = textContentKnob()
    const url = urlKnob()

    return (
      <StoryWrapper>
        <a className="no-underline" href={url}>
          {textContent}
        </a>
      </StoryWrapper>
    )
  })
  .add("basic button", () => {
    const textContent = textContentKnob()

    return (
      <StoryWrapper>
        <button onClick={action("clicked")}>{textContent}</button>
      </StoryWrapper>
    )
  })
  .add("outlined button", () => {
    const textContent = textContentKnob()

    return (
      <StoryWrapper>
        <button className="outlined" onClick={action("clicked")}>
          {textContent}
        </button>
      </StoryWrapper>
    )
  })
  .add("dark-outlined button", () => {
    const textContent = textContentKnob()

    return (
      <StoryWrapper>
        <button className="dark-outlined" onClick={action("clicked")}>
          {textContent}
        </button>
      </StoryWrapper>
    )
  })
  .add("compact button", () => {
    const textContent = textContentKnob()

    return (
      <StoryWrapper>
        <button className="compact" onClick={action("clicked")}>
          {textContent}
        </button>
      </StoryWrapper>
    )
  })

const fakeUrl = (prefix, id) =>
  `https://avatars.dicebear.com/v2/identicon/${prefix}_${id}.svg`

const postStories = storiesOf("Post", module)
  .addDecorator(withRandom)
  .addDecorator(withRouter)
  .addDecorator(withRedux)
  .addDecorator(withSettings)
  .addDecorator(withKnobs)
;[[true, "compact url post"], [false, "compact text post"]].forEach(
  ([isUrl, storyName]) => {
    postStories.add(storyName, () => {
      const menuOpen = boolean("Menu open", false)
      const showPinUI = boolean("Show pin UI", false)
      const showChannelLink = boolean("Show channel link", false)
      const upvoted = boolean("Upvoted", false)
      const isAnonymous = boolean("As anonymous", false)
      const isModerator = boolean("As moderator", false)

      const post = makePost(isUrl)
      post.profile_image = fakeUrl("pr", post.author_id)
      if (isUrl) {
        post.thumbnail = fakeUrl("th", post.author_id)
      }
      if (!isAnonymous) {
        SETTINGS.username = "user"
      }
      post.stickied = showPinUI
      post.upvoted = upvoted
      post.title = text("Title", post.title)
      if (isUrl) {
        post.url = text("Url", post.url)
      } else {
        post.text = text("Text", post.text)
      }

      return (
        <StoryWrapper>
          <CompactPostDisplay
            post={post}
            menuOpen={menuOpen}
            showChannelLink={showChannelLink}
            showPinUI={showPinUI}
            removePost={action("remove post")}
            ignorePostReports={action("ignore post reports")}
            reportPost={action("report post")}
            togglePinPost={action("pin")}
            isModerator={isModerator}
          />
        </StoryWrapper>
      )
    })
  }
)
;[[true, "expanded url post"], [false, "expanded text post"]].forEach(
  ([isUrl, storyName]) => {
    postStories.add(storyName, () => {
      const menuOpen = boolean("Menu open", false)
      const shareMenuOpen = boolean("Share menu open", false)
      const isEditing = isUrl ? boolean("Show edit form", false) : false
      const showPermalinkUI = boolean("Show permalink UI", false)
      const embedlyLoading = isUrl ? boolean("Embedly loading", false) : true
      const upvoted = boolean("Upvoted", false)
      const isPrivateChannel = boolean("Is private channel", false)
      const isAnonymous = boolean("As anonymous", false)
      const userIsAuthor = boolean("As comment author", false)
      const isModerator = boolean("As moderator", false)

      const channel = makeChannel()
      channel.channel_type = isPrivateChannel
        ? CHANNEL_TYPE_PRIVATE
        : CHANNEL_TYPE_PUBLIC
      const post = makePost(isUrl, channel)
      post.profile_image = fakeUrl("pr", post.author_id)
      if (isUrl) {
        post.thumbnail = fakeUrl("th", post.author_id)
      }
      post.upvoted = upvoted

      post.title = text("Title", post.title)
      if (isUrl) {
        post.url = text("Url", post.url)
      } else {
        post.text = text("Text", post.text)
      }
      const forms = {}
      if (isEditing) {
        forms[editPostKey(post)] = {
          value: {
            text: post.text
          }
        }
      }
      setReducerState({ forms })

      if (!isAnonymous) {
        SETTINGS.username = userIsAuthor ? post.author_id : "user"
      }

      const embedly = embedlyLoading
        ? undefined
        : {
          title:         "Embedly Storybook title",
          description:   "Embedly Storybook description",
          url:           post.url,
          provider_name: "Storybook"
        }

      return (
        <StoryWrapper>
          <Card className="post-card">
            <div className="post-card-inner">
              <ExpandedPostDisplay
                post={post}
                postDropdownMenuOpen={menuOpen}
                postShareMenuOpen={shareMenuOpen}
                removePost={action("remove post")}
                isModerator={isModerator}
                forms={forms}
                showPermalinkUI={showPermalinkUI}
                embedly={embedly}
                beginEditing={action("begin editing")}
                channel={channel}
                toggleFollowPost={action("toggle follow post")}
              />
            </div>
          </Card>
          {showPermalinkUI ? null : (
            <ReplyToPostForm
              forms={forms}
              post={post}
              processing={false}
              profile={{
                profile_image_small: fakeUrl("pr", "me")
              }}
            />
          )}
        </StoryWrapper>
      )
    })
  }
)

storiesOf("Comment", module)
  .addDecorator(withRandom)
  .addDecorator(withRouter)
  .addDecorator(withRedux)
  .addDecorator(withSettings)
  .addDecorator(withKnobs)
  .add("comment", () => {
    const menuOpen = boolean("Menu open", false)
    const shareMenuOpen = boolean("Share menu open", false)
    const upvoted = boolean("Upvoted", false)
    const downvoted = boolean("Downvoted", false)
    const isEditing = boolean("Show edit form", false)
    const isReply = boolean("Show reply form", false)
    const deleted = boolean("Deleted", false)
    const removed = boolean("Removed", false)
    const moderationUI = boolean("Reported comments UI", false)
    const isPrivateChannel = boolean("Is private channel", false)
    const numReports = number("Number of reports", 0)
    const isAnonymous = boolean("As anonymous", false)
    const userIsAuthor = boolean("As comment author", false)
    const isModerator = boolean("As moderator", false)

    // The comments aren't broken out into pieces so it's easier just to render the CommentTree with only one comment
    const channel = makeChannel()
    const post = makePost(false, channel)
    const responses = makeCommentsResponse(post, 1, 3, 3)
    const comment = {
      ...createCommentTree(responses)[0],
      profile_image: fakeUrl("pr", responses[0].author_id),
      replies:       [],
      children:      [],
      num_comments:  0
    }
    const comments = [comment]
    comment.text = text("Text", comment.text)

    const dropdownMenus = new Set()
    if (menuOpen) {
      dropdownMenus.add(commentDropdownKey(comment))
    }
    if (shareMenuOpen) {
      dropdownMenus.add(commentShareKey(comment))
    }
    comment.upvoted = upvoted
    comment.downvoted = downvoted
    comment.deleted = deleted
    comment.removed = removed
    comment.num_reports = numReports

    const forms = {}
    if (isEditing) {
      forms[editCommentKey(comment)] = {
        value: {
          text: comment.text
        }
      }
    }
    if (isReply) {
      forms[replyToCommentKey(comment)] = {}
    }
    setReducerState({ forms })

    if (!isAnonymous) {
      SETTINGS.username = userIsAuthor ? comment.author_id : "user"
    }
    return (
      <StoryWrapper store={store}>
        <CommentTree
          comments={comments}
          commentPermalink={commentPermalink(channel.name, post.id, post.slug)}
          curriedDropdownMenufunc={dropdownMenuFuncs(action("clicked"))}
          isModerator={isModerator}
          loadMoreComments={action("load more comments")}
          dropdownMenus={dropdownMenus}
          moderationUI={moderationUI}
          upvote={action("upvote")}
          downvote={action("downvote")}
          isPrivateChannel={isPrivateChannel}
          beginEditing={action("begin editing")}
          reportComment={action("report")}
          ignoreCommentReports={action("ignore reports")}
          deleteComment={action("delete")}
          approve={action("approve")}
          remove={action("remove")}
          forms={forms}
        />
      </StoryWrapper>
    )
  })
  .add("load more comments", () => {
    // The comments aren't broken out into pieces so it's easier just to render the CommentTree with only one comment
    const channel = makeChannel()
    const post = makePost(false, channel)
    const responses = [makeMoreComments(post)]
    const comments = [createCommentTree(responses)[0]]

    return (
      <StoryWrapper>
        <CommentTree
          comments={comments}
          commentPermalink={commentPermalink(channel.name, post.id, post.slug)}
          curriedDropdownMenufunc={dropdownMenuFuncs(action("clicked"))}
          dropdownMenus={new Set()}
          isModerator={boolean("Is moderator", false)}
          loadMoreComments={action("load more comments")}
        />
      </StoryWrapper>
    )
  })
  .add("tree", () => {
    const channel = makeChannel()
    const post = makePost(false, channel)
    const responses = makeCommentsResponse(post, 1, 3, 3).map(response => ({
      ...response,
      profile_image: fakeUrl("tr", response.id)
    }))
    const comments = createCommentTree(responses)

    return (
      <StoryWrapper>
        <CommentTree
          comments={comments}
          commentPermalink={commentPermalink(channel.name, post.id, post.slug)}
          curriedDropdownMenufunc={dropdownMenuFuncs(action("clicked"))}
          dropdownMenus={new Set()}
        />
      </StoryWrapper>
    )
  })

storiesOf("Pickers", module)
  .add("post sort", () => {
    return (
      <StoryWrapper>
        <PostSortPicker
          updatePickerParam={action("update sort param")}
          value="top"
        />
      </StoryWrapper>
    )
  })
  .add("comment sort", () => {
    return (
      <StoryWrapper>
        <CommentSortPicker
          updatePickerParam={action("update sort param")}
          value="old"
        />
      </StoryWrapper>
    )
  })
  .add("search filter", () => {
    return (
      <StoryWrapper>
        <SearchFilterPicker
          updatePickerParam={action("update sort param")}
          value=""
        />
      </StoryWrapper>
    )
  })

storiesOf("Channel header", module)
  .addDecorator(withKnobs)
  .addDecorator(withRandom)
  .addDecorator(withRouter)
  .addDecorator(withRedux)
  .add("header", () => {
    const channel = makeChannel()
    const hasPic = boolean("Has background pic", false)
    const hasAvatar = boolean("Has avatar", false)
    channel.banner = hasPic ? "https://picsum.photos/1024/200" : null
    channel.avatar_small = hasAvatar ? fakeUrl("pr", channel.name) : null
    channel.avatar_medium = channel.avatar_small
    return (
      <div className="app">
        <div className="content">
          <div className="loaded">
            <div className="channel-page-wrapper">
              <ChannelHeader
                channel={channel}
                isModerator={boolean("Is moderator", false)}
              />
            </div>
          </div>
        </div>
      </div>
    )
  })

storiesOf("Search textbox", module)
  .addDecorator(withKnobs)
  .add("search", () => {
    return (
      <StoryWrapper>
        <SearchTextbox
          className="search-field"
          onSubmit={action("search")}
          onClear={action("clear")}
          onChange={action("change")}
          value={text("text", "terms to search for")}
        />
      </StoryWrapper>
    )
  })

storiesOf("Search results", module)
  .addDecorator(withKnobs)
  .addDecorator(withRandom)
  .addDecorator(withRouter)
  .addDecorator(withRedux)
  .addDecorator(withSettings)
  .add("post", () => {
    return (
      <StoryWrapper>
        <SearchResult result={makePostResult()} />
      </StoryWrapper>
    )
  })
  .add("comment", () => {
    SETTINGS.username = "user"
    const result = makeCommentResult()
    result.author_avatar_small = fakeUrl("small", result.id)
    return (
      <StoryWrapper>
        <SearchResult result={result} />
      </StoryWrapper>
    )
  })
  .add("profile", () => {
    const result = makeProfileResult()
    result.author_avatar_small = fakeUrl("small", result.author_id)
    result.author_avatar_medium = fakeUrl("med", result.author_id)
    return (
      <StoryWrapper>
        <SearchResult result={result} />
      </StoryWrapper>
    )
  })

storiesOf("Widgets", module)
  .addDecorator(withKnobs)
  .add("markdown", () => {
    const editing = boolean("editing")
    const instance = makeWidgetInstance(WIDGET_TYPE_MARKDOWN)
    instance.title = text("title", "Markdown widget title")
    instance.configuration.source = text("markdown", "Markdown **body**")

    const SortableWidgetInstance = SortableContainer(props => (
      <WidgetInstance {...props} />
    ))
    return (
      <StoryWrapper>
        <SortableWidgetInstance
          index={0}
          widgetInstance={instance}
          editing={editing}
          deleteInstance={action("delete")}
          startEditInstance={action("start edit instance")}
        />
      </StoryWrapper>
    )
  })
  .add("rss", () => {
    const editing = boolean("editing")
    const instance = makeWidgetInstance(WIDGET_TYPE_RSS)
    instance.title = text("title", "Default widget title")

    const SortableWidgetInstance = SortableContainer(props => (
      <WidgetInstance {...props} />
    ))
    return (
      <StoryWrapper>
        <SortableWidgetInstance
          index={0}
          widgetInstance={instance}
          editing={editing}
          deleteInstance={action("delete")}
          startEditInstance={action("start edit instance")}
        />
      </StoryWrapper>
    )
  })
  .add("url", () => {
    const editing = boolean("editing")
    const instance = makeWidgetInstance(WIDGET_TYPE_URL)
    instance.title = text("title", "URL widget title")
    instance.configuration = {
      url:
        "https://video.odl.mit.edu/videos/d4984722a10c46d580245aa897695c51/embed/"
    }

    const SortableWidgetInstance = SortableContainer(props => (
      <WidgetInstance {...props} />
    ))
    return (
      <StoryWrapper>
        <SortableWidgetInstance
          index={0}
          widgetInstance={instance}
          editing={editing}
          deleteInstance={action("delete")}
          startEditInstance={action("start edit instance")}
        />
      </StoryWrapper>
    )
  })
  .add("list", () => {
    const editing = boolean("editing")
    const allCollapsed = boolean("collapsed")
    const list = makeWidgetListResponse().widgets
    const collapsed = {}
    for (const widget of list) {
      collapsed[getWidgetKey(widget)] = allCollapsed
    }

    return (
      <StoryWrapper>
        <WidgetList
          startAddInstance={action("start add")}
          startEditInstance={action("start edit")}
          clearForm={action("clear")}
          deleteInstance={action("delete")}
          submitForm={action("submit")}
          widgetInstances={list}
          collapsed={collapsed}
          setCollapsed={action("collapse")}
          editing={editing}
        />
      </StoryWrapper>
    )
  })

storiesOf("Form inputs", module)
  .addDecorator(withKnobs)
  .add("basic text input", () => {
    return (
      <StoryWrapper>
        <input
          type="text"
          placeholder="type something!"
          value={text("text", "")}
          onChange={action("change")}
          disabled={boolean("disabled")}
        />
      </StoryWrapper>
    )
  })
  .add("underlined text input", () => {
    return (
      <StoryWrapper>
        <input
          type="text"
          className="underlined"
          placeholder="type something!"
          value={text("text", "")}
          onChange={action("change")}
          disabled={boolean("disabled")}
        />
      </StoryWrapper>
    )
  })
  .add("h1/title style text input", () => {
    return (
      <StoryWrapper>
        <input
          type="text"
          className="h1"
          placeholder="type something!"
          value={text("text", "")}
          onChange={action("change")}
          disabled={boolean("disabled")}
        />
      </StoryWrapper>
    )
  })

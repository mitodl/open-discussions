// @flow
/* global SETTINGS:false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import Editor, { editorUpdateFormShim } from "./Editor"
import ArticleEditor from "./ArticleEditor"
import CoverImageInput from "./CoverImageInput"

import { validationMessage } from "../lib/validation"
import { actions } from "../actions"
import {
  isEmptyText,
  userIsAnonymous,
  preventDefaultAndInvoke
} from "../lib/util"
import { LINK_TYPE_ARTICLE } from "../lib/channels"
import { validatePostCreateForm } from "../lib/validation"

import type { CommentFormType, Post, Profile } from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"
import type { Dispatch } from "redux"

type Props = {
  dispatch: Dispatch<*>,
  forms: FormsState,
  post: Post,
  initialValue: CommentFormType,
  formKey: string,
  beginEditing: (initialValue: Object, e: ?Event) => void,
  onUpdate: (e: Event) => void,
  cancelReply: () => void,
  processing: boolean,
  patchPost: (p: Object) => void,
  editing: boolean,
  profile?: Profile,
  setValidationErrors: (errors: Object) => void
}

export const editPostKey = (post: Post) => `post:${post.id}:edit`

const getPostReplyInitialValue = (parent: Post) => ({
  post_id: parent.id,
  text:    ""
})

const getEditFormKeyFromOwnProps = ownProps => editPostKey(ownProps.post)

const mapStateToProps = (state, ownProps) => {
  const initialValue = getPostReplyInitialValue(ownProps.post)

  return {
    initialValue,
    post:    ownProps.post || state.posts.data.get(initialValue.post_id),
    forms:   state.forms,
    formKey: getEditFormKeyFromOwnProps(ownProps)
  }
}

const cancelReply = R.curry(
  (dispatch, formKey) => () => dispatch(actions.forms.formEndEdit({ formKey }))
)

export const beginEditing = R.curry((dispatch, formKey, initialValue, e) => {
  if (e) {
    e.preventDefault()
  }
  dispatch(
    actions.forms.formBeginEdit({
      formKey,
      value: R.clone(initialValue)
    })
  )
})

const mapDispatchToProps = (dispatch: any, ownProps: Props) => {
  const formKey = getEditFormKeyFromOwnProps(ownProps)

  return {
    onUpdate: e => {
      const {
        target: { name, value }
      } = e
      dispatch(
        actions.forms.formUpdate({
          formKey,
          value: { [name]: value }
        })
      )
    },
    cancelReply:         cancelReply(dispatch, formKey),
    beginEditing:        beginEditing(dispatch, formKey),
    setValidationErrors: errors =>
      dispatch(
        actions.forms.formValidate({
          formKey,
          errors
        })
      ),
    patchPost: post =>
      dispatch(actions.posts.patch(post.id, post)).then(() => {
        cancelReply(dispatch, formKey)()
      })
  }
}

const EditPostForm: Class<React$Component<*, *>> = connect(
  mapStateToProps,
  mapDispatchToProps
)(
  class EditPostForm extends React.Component<*, *> {
    constructor(props) {
      super(props)
      this.state = {
        patching:       false,
        showCoverImage: true
      }
    }

    props: Props

    state: {
      patching: boolean,
      showCoverImage: boolean
    }

    onSubmit = async e => {
      const { formKey, forms, patchPost, post, setValidationErrors } =
        this.props
      e.preventDefault()
      const form = R.prop(formKey, forms)
      // eslint-disable-next-line camelcase
      const { text, article_content, cover_image } = form.value

      const validation = validatePostCreateForm(form)

      if (!R.isEmpty(validation)) {
        setValidationErrors(validation)
      } else {
        const { id } = post
        this.setState({ patching: true })
        // eslint-disable-next-line camelcase
        const content =
          post.post_type === LINK_TYPE_ARTICLE
            ? { id, article_content, cover_image }
            : { id, text }
        try {
          await patchPost(content)
        } catch (_) {
          this.setState({ patching: false })
        }
      }
    }

    hideCoverImageInput = () => {
      this.setState({ showCoverImage: false })
    }

    render() {
      const { forms, formKey, onUpdate, cancelReply, post } = this.props
      const { patching, showCoverImage } = this.state
      const text = R.pathOr("", [formKey, "value", "text"], forms)
      const image = R.pathOr(null, [formKey, "value", "cover_image"], forms)
      const article = R.pathOr(
        null,
        [formKey, "value", "article_content"],
        forms
      )

      const validation = R.pathOr({}, [formKey, "errors", "value"], forms)

      return (
        <React.Fragment>
          {article && showCoverImage ? (
            <CoverImageInput
              image={image}
              onUpdate={onUpdate}
              hideCoverImageInput={this.hideCoverImageInput}
            />
          ) : null}
          <div className="reply-form">
            <form
              onSubmit={this.onSubmit}
              className="form"
              onKeyDown={e => {
                if (
                  e.key === "Enter" &&
                  e.ctrlKey &&
                  !patching &&
                  !isEmptyText(text)
                ) {
                  this.onSubmit(e)
                }
              }}
            >
              <div className="form-item">
                {post.post_type === LINK_TYPE_ARTICLE ? (
                  <ArticleEditor
                    initialData={article}
                    onChange={editorUpdateFormShim("article_content", onUpdate)}
                  />
                ) : (
                  <Editor
                    initialValue={text || ""}
                    onChange={editorUpdateFormShim("text", onUpdate)}
                    autoFocus={true}
                  />
                )}
                {validation
                  ? validationMessage(
                    post.post_type === LINK_TYPE_ARTICLE
                      ? validation.article_content
                      : validation.text
                  )
                  : null}
              </div>
              <button
                type="submit"
                disabled={
                  post.post_type === LINK_TYPE_ARTICLE
                    ? patching
                    : (patching || isEmptyText(text)) && !userIsAnonymous()
                }
              >
                Submit
              </button>
              <button
                onClick={preventDefaultAndInvoke(cancelReply)}
                className="cancel"
              >
                Cancel
              </button>
            </form>
          </div>
        </React.Fragment>
      )
    }
  }
)

export default EditPostForm

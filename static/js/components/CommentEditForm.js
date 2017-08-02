// @flow
import React from "react"

import type {
  CommentEditable,
  Comment,
  Post,
} from "../flow/discussionTypes"
import type { FormValue } from "../flow/formTypes"

type CommentEditProps = {
  onSubmit: Function,
  onUpdate: Function,
  form:     FormValue<CommentEditable>,
  post:     Post,
  comment?: Comment,
}

const ChannelEditForm = ({ onSubmit, onUpdate, form }: CommentEditProps) => form.value ? (
  <form onSubmit={onSubmit} className="form">
    <div className="form-item">
      <label htmlFor="text" className="label">Comment</label>
      <textarea
        name="text"
        type="text"
        className="input"
        value={form.value.text}
        onChange={onUpdate}
      />
    </div>

    <button type="submit">Reply</button>
  </form>
) : null

export default ChannelEditForm;

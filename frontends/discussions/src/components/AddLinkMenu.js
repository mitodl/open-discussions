// @flow
import React from "react"

import CloseButton from "./CloseButton"

type Props = {|
  onSubmit: Function,
  onChange: Function,
  closeMenu: Function,
  text: string,
  url: string
|}

const AddLinkMenu = ({ onSubmit, onChange, closeMenu, text, url }: Props) => (
  <div className="add-link-menu">
    <CloseButton onClick={closeMenu} />
    <div className="link-menu-row">
      <label>Text</label>
      <input type="text" name="text" onChange={onChange} value={text} />
    </div>
    <div className="link-menu-row">
      <label>URL</label>
      <input type="url" onChange={onChange} value={url} name="url" autoFocus />
      <button onClick={onSubmit} type="submit" className="submit-link">
        Add Link
      </button>
    </div>
  </div>
)

export default AddLinkMenu

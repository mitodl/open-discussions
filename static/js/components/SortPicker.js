// @flow
import React from "react"
import R from "ramda"
import { Menu, MenuItem, MenuAnchor } from "rmwc/Menu"

import { DropDownArrow, DropUpArrow } from "./UserMenu"

import {
  VALID_POST_SORT_LABELS,
  VALID_COMMENT_SORT_LABELS
} from "../lib/sorting"

type Props = {
  updateSortParam: (t: string) => void,
  value: string
}

type State = {
  menuOpen: boolean
}

const SortPicker = labels => {
  class SortPicker extends React.Component<Props, State> {
    constructor(props: Props) {
      super(props)
      this.state = {
        menuOpen: false
      }
    }

    toggleMenuOpen = () => {
      const { menuOpen } = this.state
      this.setState({ menuOpen: !menuOpen })
    }

    render() {
      const { updateSortParam, value } = this.props
      const { menuOpen } = this.state

      return (
        <MenuAnchor className="sorter">
          <Menu open={menuOpen} onClose={this.toggleMenuOpen}>
            {labels.map(([type, label]) => (
              <MenuItem key={label} onClick={updateSortParam(type)}>
                {label}
              </MenuItem>
            ))}
          </Menu>
          <div className="current-sort" onClick={this.toggleMenuOpen}>
            {R.fromPairs(labels)[value]}
            {menuOpen ? <DropUpArrow /> : <DropDownArrow />}
          </div>
        </MenuAnchor>
      )
    }
  }
  return SortPicker
}

export const PostSortPicker = SortPicker(VALID_POST_SORT_LABELS)

export const CommentSortPicker = SortPicker(VALID_COMMENT_SORT_LABELS)

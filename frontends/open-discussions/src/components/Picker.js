// @flow
import React from "react"
import R from "ramda"
import { Menu, MenuItem, MenuSurfaceAnchor } from "@rmwc/menu"

import { DropDownArrow, DropUpArrow } from "./Arrow"

import {
  VALID_POST_SORT_LABELS,
  VALID_COMMENT_SORT_LABELS,
  VALID_SEARCH_FILTER_LABELS,
  VALID_MEMBERS_SORT_LABELS
} from "../lib/picker"

type Props = {
  updatePickerParam: (value: string) => (event: Event) => void,
  value: string
}
type State = {
  menuOpen: boolean
}

const Picker = (labels, className) => {
  class Picker extends React.Component<Props, State> {
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
      const { updatePickerParam, value } = this.props
      const { menuOpen } = this.state

      return (
        <MenuSurfaceAnchor className={`picker ${className}`}>
          <Menu open={menuOpen} onClose={this.toggleMenuOpen}>
            {labels.map(([type, label]) => (
              <MenuItem key={label} onClick={updatePickerParam(type)}>
                {label}
              </MenuItem>
            ))}
          </Menu>
          <div className="current-pick" onClick={this.toggleMenuOpen}>
            {R.fromPairs(labels)[value]}
            {menuOpen ? <DropUpArrow /> : <DropDownArrow />}
          </div>
        </MenuSurfaceAnchor>
      )
    }
  }
  return Picker
}

export const PostSortPicker = Picker(VALID_POST_SORT_LABELS, "post-sort-picker")
PostSortPicker.displayName = "PostSortPicker"

export const CommentSortPicker = Picker(
  VALID_COMMENT_SORT_LABELS,
  "comment-sort-picker"
)
CommentSortPicker.displayName = "CommentSortPicker"

export const SearchFilterPicker = Picker(
  VALID_SEARCH_FILTER_LABELS,
  "search-filter-picker"
)
SearchFilterPicker.displayName = "SearchFilterPicker"

export const ChannelMembersSortPicker = Picker(
  VALID_MEMBERS_SORT_LABELS,
  "channel-member-sort-picker"
)
ChannelMembersSortPicker.displayName = "ChannelMembersSortPicker"

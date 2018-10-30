// @flow
import React from "react"
import { toggleMark, wrapIn } from "prosemirror-commands"
import { wrapInList } from "prosemirror-schema-list"

import { markIsActive, selectionIsEmpty } from "../../lib/prosemirror"

type Props = { view: Object, schema: Object }

// helpers for the menu bar
type MenuBarItem = {
  command: Function,
  title: string,
  icon: React$Element<"i">,
  active?: Function
}

// each array in this array represents a 'group' of buttons
// (we want to group certain buttons together with a border
// around them in the UI)
export const menuBarManifest = (schema: Object) =>
  Array < Array < MenuBarItem >> ([
    [
      {
        command: toggleMark(schema.marks.strong),
        title:   "Bold",
        icon:    <i className="material-icons format_bold">format_bold</i>,
        active:  markIsActive(schema.marks.strong)
      }
    ],
    [
      {
        command: toggleMark(schema.marks.em),
        title:   "Italic",
        icon:    <i className="material-icons format_italic">format_italic</i>,
        active:  markIsActive(schema.marks.em)
      }
    ],
    [
      {
        command: wrapInList(schema.nodes.bullet_list),
        title:   "bullet list",
        icon:    (
          <i className="material-icons format_list_bulleted">
            format_list_bulleted
          </i>
        )
      },
      {
        command: wrapInList(schema.nodes.ordered_list),
        title:   "ordered list",
        icon:    (
          <i className="material-icons format_list_numbered">
            format_list_numbered
          </i>
        )
      },
      {
        command: wrapIn(schema.nodes.blockquote),
        title:   "quote",
        icon:    <i className="material-icons format_quote">format_quote</i>
      }
    ]
  ])

export default class MenuBar extends React.Component<Props> {
  constructor(props: Props) {
    super(props)
    const { schema } = props
    this.menuBarManifest = menuBarManifest(schema)
  }

  render() {
    const { view, schema } = this.props

    const selectionEmpty = selectionIsEmpty(view)

    const linkIconName =
      view && markIsActive(schema.marks.link, view.state) ? "link_off" : "link"

    return (
      <div className="menu-bar">
        {menuBarManifest.map((buttonGroup, idx) => (
          <div className="button-group" key={idx}>
            {buttonGroup.map(this.renderMenuButton)}
          </div>
        ))}
        <div className="button-group">
          <div
            className={`menu-button ${selectionEmpty ? "disabled" : ""}`}
            onClick={selectionEmpty ? null : this.handleLinkClick}
          >
            <i className={`material-icons ${linkIconName}`}>{linkIconName}</i>
          </div>
        </div>
      </div>
    )
  }
}

// @flow
import React from "react"
import { toggleMark, wrapIn, setBlockType } from "prosemirror-commands"
import { wrapInList } from "prosemirror-schema-list"

import {
  markIsActive,
  selectionIsEmpty,
  getSelectedText
} from "../../lib/prosemirror"

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
export const menuBarManifest = (schema: Object): Array<Array<MenuBarItem>> => [
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
  ],
  [
    {
      command: setBlockType(schema.nodes.heading, { level: 1 }),
      title:   "heading",
      icon:    <i className="material-icons phone">phone</i>
      // active: setBlockType(schema.nodes.heading, { level: 1 }),
    },
    {
      command: setBlockType(schema.nodes.paragraph, { level: 1 }),
      title:   "heading",
      icon:    (
        <i className="material-icons format_indent_decrease">
          format_indent_decrease
        </i>
      )
      // active: setBlockType(schema.nodes.paragraph),
    }
  ]
]

export const menuButtonClass = (
  state: ?Object,
  command: Function,
  active: ?Function
) => {
  // on the first render call this.view isn't there yet
  // so we skip checking things in the state
  if (!state) {
    return "menu-button"
  }

  if (active && active(state)) {
    return "menu-button active"
  } else if (!command(state)) {
    return "menu-button disabled"
  }
  return "menu-button"
}

type Props = {
  view: Object,
  schema: Object,
  dispatchTransaction: Function
}

export default class MenuBar extends React.Component<Props> {
  constructor(props: Props) {
    super(props)
    const { schema } = props
    this.menuBarManifest = menuBarManifest(schema)
  }

  handleLinkClick = () => {
    const { view, dispatchTransaction, schema, openLinkMenu } = this.props

    if (markIsActive(schema.marks.link, view.state)) {
      dispatchTransaction(
        view.state.tr.replaceSelectionWith(
          schema.text(getSelectedText(view)),
          false
        )
      )
      view.focus()
    } else {
      openLinkMenu()
    }
  }

  menuClickHandlerCreator = (command: Function) => (e: Object) => {
    const { view } = this.props
    e.preventDefault()
    command(view.state, view.dispatch, view)
    view.focus()
  }

  renderMenuButton = ({ command, title, icon, active }: MenuBarItem) => {
    const { view } = this.props

    return (
      <div
        className={menuButtonClass(view ? view.state : null, command, active)}
        onClick={this.menuClickHandlerCreator(command)}
        key={title}
      >
        {icon}
      </div>
    )
  }

  render() {
    const { view, schema } = this.props

    const selectionEmpty = selectionIsEmpty(view)

    const linkIconName =
      view && markIsActive(schema.marks.link, view.state) ? "link_off" : "link"

    return (
      <div className="pm-menu-bar">
        {this.menuBarManifest.map((buttonGroup, idx) => (
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

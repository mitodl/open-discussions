// @flow
import React from "react"

type Props = {}

export default class MenuBar extends React.Component<Props> {
  render() {
    const selectionIsEmpty = this.selectionIsEmpty()

    const linkIconName =
      this.view && markIsActive(schema.marks.link, this.view.state)
        ? "link_off"
        : "link"

    return (
      <div className="menu-bar">
        {menuBarManifest.map((buttonGroup, idx) => (
          <div className="button-group" key={idx}>
            {buttonGroup.map(this.renderMenuButton)}
          </div>
        ))}
        <div className="button-group">
          <div
            className={`menu-button ${selectionIsEmpty ? "disabled" : ""}`}
            onClick={selectionIsEmpty ? null : this.handleLinkClick}
          >
            <i className={`material-icons ${linkIconName}`}>{linkIconName}</i>
          </div>
        </div>
      </div>
    )
  }
}

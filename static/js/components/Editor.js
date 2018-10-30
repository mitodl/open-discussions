// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { exampleSetup } from "prosemirror-example-setup"
import {
  schema,
  defaultMarkdownParser,
  defaultMarkdownSerializer
} from "prosemirror-markdown"

import AddLinkMenu from "../components/AddLinkMenu"
import MenuBar from "../components/ProseMirror/MenuBar"

import { makeUUID } from "../lib/util"
import { configureForm } from "../lib/forms"
import { markIsActive, getSelectedText } from "../lib/prosemirror"

import type { Dispatch } from "redux"

export const newLinkForm = () => ({
  url:  "",
  text: ""
})

type Props = {
  onChange: (serialized: string) => void,
  initialValue?: string,
  autoFocus?: boolean,
  dispatch: Dispatch<*>
}

type State = {
  editorState: Object,
  showLinkMenu: boolean
}

export class Editor extends React.Component<Props, State> {
  node: { current: null | React$ElementRef<typeof HTMLDivElement> }
  view: Object
  uuid: string
  formHelpers: Object
  dispatchTransaction: Function = this.dispatchTransaction.bind(this)

  constructor(props: Props) {
    super(props)
    this.node = React.createRef()
    this.uuid = makeUUID(10)

    const { getForm, actionCreators } = configureForm(this.uuid, newLinkForm)
    this.formHelpers = {
      getForm,
      ...actionCreators
    }

    const { initialValue } = props
    const editorStateOptions = {
      doc:     defaultMarkdownParser.parse(initialValue || ""),
      plugins: exampleSetup({
        schema,
        menuBar: false
      })
    }

    this.state = {
      editorState:  EditorState.create(editorStateOptions),
      showLinkMenu: false
    }
  }

  componentDidMount() {
    const { autoFocus } = this.props
    const { editorState } = this.state

    if (this.node.current) {
      this.view = new EditorView(this.node.current, {
        state:               editorState,
        dispatchTransaction: this.dispatchTransaction
      })

      if (autoFocus) {
        this.view.focus()
      }
    }
  }

  dispatchTransaction(transaction: Object) {
    // we need our own handler for this so we can hook into
    // the EditorState lifecycle to synchronize it with the
    // redux store (via the onChange prop)
    const { onChange } = this.props

    const state = this.view.state.apply(transaction)
    this.view.updateState(state)
    this.setState({ editorState: state })

    onChange(defaultMarkdownSerializer.serialize(this.view.state.doc))
  }

  handleLinkClick = () => {
    if (markIsActive(schema.marks.link, this.view.state)) {
      this.dispatchTransaction(
        this.view.state.tr.replaceSelectionWith(
          schema.text(getSelectedText(this.view)),
          false
        )
      )
      this.view.focus()
    } else {
      this.openLinkMenu()
    }
  }

  openLinkMenu = () => {
    const { dispatch } = this.props
    const { formBeginEdit, formUpdate } = this.formHelpers

    dispatch(formBeginEdit())
    dispatch(formUpdate({ text: getSelectedText(this.view) }))
    this.setState({ showLinkMenu: true })
  }

  closeLinkMenu = () => {
    this.setState({ showLinkMenu: false })
  }

  updateLinkMenuForm = (e: SyntheticInputEvent<HTMLInputElement>) => {
    const { dispatch } = this.props
    const { formUpdate } = this.formHelpers
    const { name, value } = e.target

    dispatch(
      formUpdate({
        [name]: value
      })
    )
  }

  addLinkToEditor = (e: Object) => {
    e.preventDefault()
    const { getForm } = this.formHelpers
    const {
      value: { url, text }
    } = getForm(this.props)

    this.dispatchTransaction(
      this.view.state.tr.replaceSelectionWith(
        schema.text(text, [
          schema.marks.link.create({
            href: url
          })
        ]),
        false
      )
    )

    this.view.focus()
    this.closeLinkMenu()
  }

  setEditorFocus = () => {
    this.view.focus()
  }

  renderLinkMenu = () => {
    const { getForm } = this.formHelpers
    const {
      value: { url, text }
    } = getForm(this.props)

    return (
      <AddLinkMenu
        onChange={this.updateLinkMenuForm}
        onSubmit={this.addLinkToEditor}
        closeMenu={this.closeLinkMenu}
        text={text}
        url={url}
      />
    )
  }

  render() {
    const { showLinkMenu } = this.state

    return (
      <div className="editor-wrapper">
        <div
          className="editor"
          id="editor"
          onClick={this.setEditorFocus}
          ref={this.node}
        />
        <MenuBar
          view={this.view}
          schema={schema}
          dispatchTransaction={this.dispatchTransaction}
          openLinkMenu={this.openLinkMenu}
        />
        {showLinkMenu ? this.renderLinkMenu() : null}
      </div>
    )
  }
}

export default connect(({ forms }) => ({ forms }))(Editor)

// a little helper to make it easier to drop the <Editor />
// in to existing form-based components
export const editorUpdateFormShim = R.curry((name, onUpdate, serialized) => {
  onUpdate({
    target: {
      name,
      value: serialized
    }
  })
})

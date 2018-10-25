// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { exampleSetup } from "prosemirror-example-setup"

import withForm from "../../hoc/withForm"
import BigLink from './nodeViews/BigLink'

import { configureForm } from "../../lib/forms"
import { bigPostSchema } from "./schema"
import ReactNodeView from "./ReactNodeView"

type Props = {
  onChange: Function
}
type State = {
  editorState: Object,
  showBigLinkMenu: boolean
}

export class BigPostEditor extends React.Component<Props, State> {
  node: { current: null | React$ElementRef<typeof HTMLDivElement> }
  view: Object
  dispatchTransaction: Function = this.dispatchTransaction.bind(this)

  constructor(props: Props) {
    super(props)

    this.node = React.createRef()

    const editorStateOptions = {
      schema:  bigPostSchema,
      plugins: exampleSetup({
        schema:  bigPostSchema,
        menuBar: false
      })
    }

    this.state = {
      editorState:     EditorState.create(editorStateOptions),
      showBigLinkMenu: false
    }
  }

  componentDidMount() {
    const { editorState } = this.state

    if (this.node.current) {
      this.view = new EditorView(this.node.current, {
        state:               editorState,
        dispatchTransaction: this.dispatchTransaction,
        nodeViews:           {
          biglink: node => new ReactNodeView(node, BigLink)
        }
      })
    }
  }

  dispatchTransaction(transaction: Object) {
    // we need our own handler for this so we can hook into
    // the EditorState lifecycle to synchronize it with the
    // redux store (via the onChange prop)
    const { onChange } = this.props

    console.log(transaction)

    const state = this.view.state.apply(transaction)
    this.view.updateState(state)
    this.setState({ editorState: state })

    console.log("we here")

    onChange(state.toJSON())
  }

  focusEditor = () => {
    this.view.focus()
  }

  addBigLinkToEditor = (e: Object) => {
    e.preventDefault()
    const { form } = this.props
    const {
      value: { url }
    } = form

    const { $from } = this.view.state.selection
    const index = $from.index()

    const tr = this.view.state.tr

    const node = bigPostSchema.nodes.biglink.create({
      href: url
    })

    tr.replaceSelectionWith(node)

    this.dispatchTransaction(tr)
    this.toggleBigLinkMenu()
  }

  toggleBigLinkMenu = () => {
    const { showBigLinkMenu } = this.state
    this.setState({ showBigLinkMenu: !showBigLinkMenu })
  }

  render() {
    const { showBigLinkMenu } = this.state
    const { renderForm } = this.props

    return (
      <div className="editor-wrapper">
        <div
          className="editor big-post-editor"
          id="editor"
          onClick={this.focusEditor}
          ref={this.node}
        />
        <button type="button" onClick={this.toggleBigLinkMenu}>
          {showBigLinkMenu ? "close link menu" : "show link menu"}
        </button>
        {showBigLinkMenu ? renderForm() : null}
        <button type="button" onClick={this.addBigLinkToEditor}>
          add link
        </button>
      </div>
    )
  }
}

const bigLinkForm = () => ({
  url: ""
})

const FORM_KEY = "add-big-link"

const { getForm, actionCreators } = configureForm(FORM_KEY, bigLinkForm)

const mapStateToProps = state => ({
  form: getForm(state)
})

const BigLinkForm = ({ form, validation, onUpdate }) => (
  <form className="form">
    <input
      type="text"
      name="url"
      value={form.url}
      onChange={onUpdate}
      placeholder="url"
    />
  </form>
)

export default R.compose(
  connect(
    mapStateToProps,
    actionCreators
  ),
  withForm(BigLinkForm)
)(BigPostEditor)

// @flow
import React from "react"
import R from "ramda"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"
import { EditorView } from "prosemirror-view"
import { schema, defaultMarkdownSerializer } from "prosemirror-markdown"
import { toggleMark } from "prosemirror-commands"
import * as pmMarkdown from "prosemirror-markdown"
import { Provider } from "react-redux"

import AddLinkMenu from "./AddLinkMenu"
import ConnectedEditor, {
  Editor,
  newLinkForm,
  menuBarManifest,
  menuButtonClass
} from "./Editor"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { shouldIf } from "../lib/test_utils"
import * as util from "../lib/util"
import * as pmLib from "../lib/prosemirror"

describe("Editor component", () => {
  let dispatch, onChange, makeUUIDStub, focusStub, helper

  const fakeUUID = "uuid wow hey great"

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    dispatch = helper.sandbox.stub()
    onChange = helper.sandbox.stub()
    makeUUIDStub = helper.sandbox.stub(util, "makeUUID").returns(fakeUUID)
    focusStub = helper.sandbox.stub(EditorView.prototype, "focus")
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderEditor = (props = {}) =>
    mount(
      <Editor dispatch={dispatch} onChange={onChange} forms={{}} {...props} />
    )

  const renderConnectedEditor = (props = {}) => {
    const wrapper = mount(
      <Provider store={helper.store}>
        <ConnectedEditor onChange={onChange} {...props} />
      </Provider>
    )
    return { wrapper, inner: wrapper.find(Editor) }
  }

  const updateWrapper = wrapper => {
    wrapper.instance().forceUpdate()
    wrapper.update()
  }

  const executeTestTransaction = wrapper =>
    toggleMark(schema.marks.strong)(
      wrapper.instance().view.state,
      wrapper.instance().view.dispatch,
      wrapper.instance().view
    )

  it("should make a new link form", () => {
    assert.deepEqual(newLinkForm(), { url: "", text: "" })
  })

  it("should use makeUUID to set a UUID on mount", () => {
    assert.equal(renderEditor().instance().uuid, fakeUUID)
    sinon.assert.called(makeUUIDStub)
  })

  it("should set form helpers with UUID for Link form on mount", () => {
    const { formHelpers } = renderEditor().instance()
    assert.isDefined(formHelpers.getForm)
    assert.isDefined(formHelpers.formBeginEdit)
    assert.isDefined(formHelpers.formEndEdit)
    assert.isDefined(formHelpers.formUpdate)
    assert.isDefined(formHelpers.formValidate)
    const action = formHelpers.formBeginEdit()
    assert.equal(action.payload.formKey, fakeUUID)
  })

  it("should create an EditorState and stick it in this.state", () => {
    const wrapper = renderEditor()
    assert.isDefined(wrapper.state().editorState)
  })

  it("should store link menu open state in this.state", () => {
    const wrapper = renderEditor()
    assert.isFalse(wrapper.state().showLinkMenu)
  })

  it("should put an EditorView on this.view", () => {
    const wrapper = renderEditor()
    assert.isDefined(wrapper.instance().view)
  })

  it("should use the initialValue prop, if passed", () => {})

  //
  ;[true, false].forEach(autoFocus => {
    it(`${shouldIf(autoFocus)} call .focus on view if autoFocus = ${String(
      autoFocus
    )}`, () => {
      renderEditor({ autoFocus })
      assert.equal(focusStub.called, autoFocus)
    })
  })

  it("should set the focus helper on the whole editor", () => {
    const wrapper = renderEditor()
    assert.equal(
      wrapper.instance().setEditorFocus,
      wrapper.find(".editor").props().onClick
    )
  })

  it("should use the initialValue prop, if supplied", () => {
    const initialValue = "# My Markdown Document\n\nJust a great doc"
    const wrapper = renderEditor({ initialValue })
    const output = defaultMarkdownSerializer.serialize(
      wrapper.instance().view.state.doc
    )
    assert.equal(output, initialValue)
  })

  describe("dispatchTransaction", () => {
    it("should bind our custom handler", () => {
      const dispatchStub = helper.sandbox.stub(
        Editor.prototype,
        "dispatchTransaction"
      )
      const wrapper = renderEditor()
      executeTestTransaction(wrapper)
      sinon.assert.called(dispatchStub)
    })

    it("should call the onChange handler", () => {
      const wrapper = renderEditor()
      executeTestTransaction(wrapper)
      sinon.assert.calledWith(onChange, "")
    })

    it("should call onChange with serialized md", () => {
      const mdStub = helper.sandbox
        .stub(pmMarkdown.defaultMarkdownSerializer, "serialize")
        .returns("# MARKDOWN!")
      executeTestTransaction(renderEditor())
      sinon.assert.calledWith(onChange, "# MARKDOWN!")
      sinon.assert.called(mdStub)
    })
  })

  describe("menuClickHandlerCreator", () => {
    it("menuClickHandlerCreator should return a function", () => {
      assert.isFunction(
        renderEditor()
          .instance()
          .menuClickHandlerCreator(helper.sandbox.stub())
      )
    })

    it("should call passed function with correct args, preventDefault, focus", () => {
      const commandStub = helper.sandbox.stub()
      const preventDefault = helper.sandbox.stub()
      const wrapper = renderEditor()
      const clickHandler = wrapper
        .instance()
        .menuClickHandlerCreator(commandStub)
      clickHandler({ preventDefault })
      sinon.assert.calledWith(
        commandStub,
        wrapper.instance().view.state,
        wrapper.instance().view.dispatch,
        wrapper.instance().view
      )
      sinon.assert.called(preventDefault)
      sinon.assert.called(focusStub)
    })
  })

  describe("menu bar", () => {
    describe("menuButtonClass", () => {
      it("should return menu-button if no state", () => {
        assert.equal(
          menuButtonClass(null, new Function(), new Function()),
          "menu-button"
        )
      })

      //
      ;[
        [true, true, "menu-button active"],
        [true, false, "menu-button active"],
        [false, true, "menu-button"],
        [false, false, "menu-button disabled"]
      ].forEach(([active, command, exp]) => {
        it(`should return ${exp} if active == ${String(
          active
        )} and command == ${String(command)}`, () => {
          const activeStub = helper.sandbox.stub().returns(active)
          const commandStub = helper.sandbox.stub().returns(command)
          assert.equal(menuButtonClass({}, commandStub, activeStub), exp)
          sinon.assert.called(activeStub)
        })
      })

      it("should defer to command if active is null", () => {
        [
          [true, "menu-button"],
          [false, "menu-button disabled"]
        ].forEach(([command, exp]) => {
          const commandStub = helper.sandbox.stub().returns(command)
          assert.equal(exp, menuButtonClass({}, commandStub, null))
        })
      })
    })

    it("should have the buttons in the manifest", () => {
      const wrapper = renderEditor()
      assert.equal(
        wrapper.find(".button-group").length,
        menuBarManifest.length + 1
      )
      const allButtons = wrapper.find(".menu-button")
      assert.equal(allButtons.length, R.flatten(menuBarManifest).length + 1)

      const buttonTexts = allButtons.map(button => button.text())
      const manifestIconNames = [
        ...R.flatten(menuBarManifest).map(item => item.icon.props.children),
        "link"
      ]
      assert.deepEqual(buttonTexts, manifestIconNames)
    })

    //
    ;[true, false].forEach(markIsActive => {
      it(`should handle link button click if link active == ${String(
        markIsActive
      )}`, () => {
        const wrapper = renderEditor()
        const isActiveStub = helper.sandbox
          .stub(pmLib, "markIsActive")
          .returns(markIsActive)
        const openLinkMenuStub = helper.sandbox.stub(
          wrapper.instance(),
          "openLinkMenu"
        )

        if (markIsActive) {
          helper.sandbox
            .stub(wrapper.instance(), "getEditorSelectionText")
            .returns("link text")
        }

        wrapper.instance().handleLinkClick()
        sinon.assert.called(isActiveStub)

        if (markIsActive) {
          sinon.assert.calledWith(onChange, "link text")
        } else {
          sinon.assert.called(openLinkMenuStub)
        }
      })
    })

    it("should let you open the link menu", () => {
      const { inner } = renderConnectedEditor()
      inner.instance().openLinkMenu()
      assert.isTrue(inner.instance().state.showLinkMenu)
      assert.deepEqual(helper.store.getState().forms, {
        [fakeUUID]: {
          value:  newLinkForm(),
          errors: {}
        }
      })
    })

    it("should let you close the link menu too!", () => {
      const { inner } = renderConnectedEditor()
      inner.instance().openLinkMenu()
      assert.isTrue(inner.instance().state.showLinkMenu)
      inner.instance().closeLinkMenu()
      assert.isFalse(inner.instance().state.showLinkMenu)
    })

    //
    ;[true, false].forEach(empty => {
      it(`should disable the link button if the selection is ${
        empty ? "" : "not "
      }empty`, () => {
        const wrapper = renderEditor()
        const selectionIsEmptyStub = helper.sandbox
          .stub(wrapper.instance(), "selectionIsEmpty")
          .returns(empty)
        updateWrapper(wrapper)
        sinon.assert.called(selectionIsEmptyStub)
        const button = wrapper.find(".menu-button").last()
        const { className, onClick } = button.props()
        if (empty) {
          assert.equal(className, "menu-button disabled")
          assert.isNull(onClick)
        } else {
          assert.equal(className, "menu-button ")
          assert.isFunction(onClick)
        }
      })
    })

    //
    ;[true, false].forEach(enabled => {
      R.flatten(menuBarManifest).forEach((item, index) => {
        it(`${shouldIf(!enabled)} disable ${item.title} button if command ${
          enabled ? "can" : "can't"
        } be applied`, () => {
          const itemActiveStub = helper.sandbox
            .stub(item, "command")
            .returns(enabled)
          const wrapper = renderEditor()
          updateWrapper(wrapper)
          const menuItem = wrapper.find(".menu-button").at(index)

          assert.equal(
            menuItem.props().className,
            enabled ? "menu-button" : "menu-button disabled"
          )
          sinon.assert.called(itemActiveStub)
        })
      })
    })

    //
    ;[
      [true, "link_off"],
      [false, "link"]
    ].forEach(([linkActive, linkNameExp]) => {
      it(`should use right link icon when linkActive === ${String(
        linkActive
      )}`, () => {
        const wrapper = renderEditor()
        const markIsActiveStub = helper.sandbox
          .stub(pmLib, "markIsActive")
          .returns(linkActive)
        wrapper.instance().forceUpdate()
        assert.equal(
          wrapper
            .find(".menu-button")
            .last()
            .text(),
          linkNameExp
        )
        sinon.assert.calledWith(markIsActiveStub, schema.marks.link)
      })
    })
  })

  describe("<AddLinkMenu />", () => {
    it("should render <AddLinkMenu /> when appropriate", () => {
      const { wrapper, inner } = renderConnectedEditor()
      inner.instance().openLinkMenu()
      wrapper.update()
      assert(wrapper.find(AddLinkMenu).exists())
      inner.instance().closeLinkMenu()
      wrapper.update()
      assert.isNotOk(wrapper.find(AddLinkMenu).exists())
    })

    it("should not render <AddLinkMenu /> if the form doesn't exist", () => {
      const { wrapper, inner } = renderConnectedEditor()
      inner.instance().openLinkMenu()
      helper.store.dispatch(
        actions.forms.formEndEdit({ formKey: inner.instance().uuid })
      )
      wrapper.update()
      assert.isFalse(wrapper.find(AddLinkMenu).exists())
    })

    it("should pass the right props to <AddLinkMenu />", () => {
      const { wrapper, inner } = renderConnectedEditor()
      inner.instance().openLinkMenu()
      wrapper.update()
      const { onChange, onSubmit, closeMenu } = wrapper
        .find(AddLinkMenu)
        .props()
      assert.equal(onChange, inner.instance().updateLinkMenuForm)
      assert.equal(onSubmit, inner.instance().addLinkToEditor)
      assert.equal(closeMenu, inner.instance().closeLinkMenu)
    })

    it("should update the form", () => {
      const wrapper = renderEditor()
      const formUpdateStub = helper.sandbox.stub(
        wrapper.instance().formHelpers,
        "formUpdate"
      )
      wrapper.instance().updateLinkMenuForm({
        target: {
          name:  "HEY",
          value: "wow"
        }
      })
      sinon.assert.calledWith(formUpdateStub, {
        HEY: "wow"
      })
    })

    it("should add link to editor", () => {
      const wrapper = renderEditor()
      const url = "https://en.wikipedia.org/wiki/Elephant"
      const text = "my great link"
      const getFormStub = helper.sandbox
        .stub(wrapper.instance().formHelpers, "getForm")
        .returns({
          value: { url, text }
        })
      const closeLinkMenuStub = helper.sandbox.stub(
        wrapper.instance(),
        "closeLinkMenu"
      )
      const preventDefault = helper.sandbox.stub()
      wrapper.instance().addLinkToEditor({ preventDefault })
      sinon.assert.called(getFormStub)
      sinon.assert.called(preventDefault)
      sinon.assert.calledWith(onChange, `[${text}](${url})`)
      sinon.assert.called(focusStub)
      sinon.assert.called(closeLinkMenuStub)
    })
  })
})

package com.pulse.intellij

import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.fileTypes.SyntaxHighlighter
import com.intellij.openapi.options.colors.AttributesDescriptor
import com.intellij.openapi.options.colors.ColorDescriptor
import com.intellij.openapi.options.colors.ColorSettingsPage
import javax.swing.Icon

class PulseColorSettingsPage : ColorSettingsPage {
    companion object {
        private val DESCRIPTORS = arrayOf(
            AttributesDescriptor("Comments//Line comment", PulseSyntaxHighlighter.COMMENT),
            AttributesDescriptor("Comments//Block comment", PulseSyntaxHighlighter.BLOCK_COMMENT),
            AttributesDescriptor("Literals//String", PulseSyntaxHighlighter.STRING),
            AttributesDescriptor("Literals//Number", PulseSyntaxHighlighter.NUMBER),
            AttributesDescriptor("Literals//Constant", PulseSyntaxHighlighter.CONSTANT),
            AttributesDescriptor("Keywords//Keyword", PulseSyntaxHighlighter.KEYWORD),
            AttributesDescriptor("Keywords//Block keyword", PulseSyntaxHighlighter.BLOCK_KEYWORD),
            AttributesDescriptor("Identifiers//Identifier", PulseSyntaxHighlighter.IDENTIFIER),
            AttributesDescriptor("Identifiers//Component", PulseSyntaxHighlighter.COMPONENT),
            AttributesDescriptor("Directives//Directive (@)", PulseSyntaxHighlighter.DIRECTIVE),
            AttributesDescriptor("Directives//Event (@click, @on...)", PulseSyntaxHighlighter.EVENT_DIRECTIVE),
            AttributesDescriptor("Directives//Accessibility (@a11y, @live...)", PulseSyntaxHighlighter.A11Y_DIRECTIVE),
            AttributesDescriptor("Directives//Router (@link, @outlet...)", PulseSyntaxHighlighter.ROUTER_DIRECTIVE),
            AttributesDescriptor("Directives//Lifecycle (@mount, @unmount)", PulseSyntaxHighlighter.LIFECYCLE_DIRECTIVE),
            AttributesDescriptor("Directives//Control flow (@if, @for...)", PulseSyntaxHighlighter.CONTROL_FLOW),
            AttributesDescriptor("Directives//Slot", PulseSyntaxHighlighter.SLOT),
            AttributesDescriptor("Selectors//Class selector (.)", PulseSyntaxHighlighter.CLASS_SELECTOR),
            AttributesDescriptor("Selectors//ID selector (#)", PulseSyntaxHighlighter.ID_SELECTOR),
            AttributesDescriptor("Brackets//Braces", PulseSyntaxHighlighter.BRACES),
            AttributesDescriptor("Brackets//Brackets", PulseSyntaxHighlighter.BRACKETS),
            AttributesDescriptor("Brackets//Parentheses", PulseSyntaxHighlighter.PARENTHESES),
            AttributesDescriptor("Operators", PulseSyntaxHighlighter.OPERATOR)
        )

        private val DEMO_TEXT = """
@page Counter

// This is a line comment
/* This is a block comment */

import Button from './Button.pulse'
import { Icon } from './icons.pulse'

state {
  count: 0
  name: "Pulse"
  active: true
}

props {
  initialValue: null
}

view {
  .counter#main {
    h1 "Count: {count}"

    // Event directives
    Button.primary @click(count++) {
      Icon "plus"
      "Increment"
    }
    input @on(input, handleInput)
    input @model(name)

    // Control flow
    @if(count > 10) {
      p.warning "High count!"
    } @else {
      p "Keep going!"
    }

    @each(items as item, index) {
      li "{item.name}"
    }

    // Accessibility directives
    div @a11y(role=dialog, label="Modal") {
      .content @live(polite) { "{status}" }
      .modal @focusTrap { "Trapped content" }
    }

    // Router directives
    @link("/home") "Home"
    @outlet

    // Lifecycle directives
    div @mount(onReady) @unmount(cleanup) {
      slot "actions"
    }
  }
}

style {
  .counter {
    padding: 20px;
    background: #f0f0f0;
  }

  .warning {
    color: red;
  }
}

actions {
  reset() {
    this.count = 0
  }

  increment() {
    this.count++
  }
}
""".trimIndent()
    }

    override fun getIcon(): Icon = PulseIcons.FILE

    override fun getHighlighter(): SyntaxHighlighter = PulseSyntaxHighlighter()

    override fun getDemoText(): String = DEMO_TEXT

    override fun getAdditionalHighlightingTagToDescriptorMap(): Map<String, TextAttributesKey>? = null

    override fun getAttributeDescriptors(): Array<AttributesDescriptor> = DESCRIPTORS

    override fun getColorDescriptors(): Array<ColorDescriptor> = ColorDescriptor.EMPTY_ARRAY

    override fun getDisplayName(): String = "Pulse"
}

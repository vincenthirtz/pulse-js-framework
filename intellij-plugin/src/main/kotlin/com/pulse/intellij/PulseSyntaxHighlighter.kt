package com.pulse.intellij

import com.intellij.lexer.Lexer
import com.intellij.openapi.editor.DefaultLanguageHighlighterColors
import com.intellij.openapi.editor.HighlighterColors
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.editor.colors.TextAttributesKey.createTextAttributesKey
import com.intellij.openapi.fileTypes.SyntaxHighlighterBase
import com.intellij.psi.tree.IElementType

class PulseSyntaxHighlighter : SyntaxHighlighterBase() {
    companion object {
        // Comments
        val COMMENT = createTextAttributesKey("PULSE_COMMENT", DefaultLanguageHighlighterColors.LINE_COMMENT)
        val BLOCK_COMMENT = createTextAttributesKey("PULSE_BLOCK_COMMENT", DefaultLanguageHighlighterColors.BLOCK_COMMENT)

        // Strings
        val STRING = createTextAttributesKey("PULSE_STRING", DefaultLanguageHighlighterColors.STRING)

        // Numbers
        val NUMBER = createTextAttributesKey("PULSE_NUMBER", DefaultLanguageHighlighterColors.NUMBER)

        // Keywords
        val KEYWORD = createTextAttributesKey("PULSE_KEYWORD", DefaultLanguageHighlighterColors.KEYWORD)
        val BLOCK_KEYWORD = createTextAttributesKey("PULSE_BLOCK_KEYWORD", DefaultLanguageHighlighterColors.KEYWORD)

        // Constants
        val CONSTANT = createTextAttributesKey("PULSE_CONSTANT", DefaultLanguageHighlighterColors.CONSTANT)

        // Identifiers
        val IDENTIFIER = createTextAttributesKey("PULSE_IDENTIFIER", DefaultLanguageHighlighterColors.IDENTIFIER)
        val COMPONENT = createTextAttributesKey("PULSE_COMPONENT", DefaultLanguageHighlighterColors.CLASS_NAME)

        // Directives
        val DIRECTIVE = createTextAttributesKey("PULSE_DIRECTIVE", DefaultLanguageHighlighterColors.METADATA)
        val SLOT = createTextAttributesKey("PULSE_SLOT", DefaultLanguageHighlighterColors.METADATA)

        // Selectors
        val CLASS_SELECTOR = createTextAttributesKey("PULSE_CLASS_SELECTOR", DefaultLanguageHighlighterColors.INSTANCE_FIELD)
        val ID_SELECTOR = createTextAttributesKey("PULSE_ID_SELECTOR", DefaultLanguageHighlighterColors.STATIC_FIELD)

        // Brackets
        val BRACES = createTextAttributesKey("PULSE_BRACES", DefaultLanguageHighlighterColors.BRACES)
        val BRACKETS = createTextAttributesKey("PULSE_BRACKETS", DefaultLanguageHighlighterColors.BRACKETS)
        val PARENTHESES = createTextAttributesKey("PULSE_PARENTHESES", DefaultLanguageHighlighterColors.PARENTHESES)

        // Operators
        val OPERATOR = createTextAttributesKey("PULSE_OPERATOR", DefaultLanguageHighlighterColors.OPERATION_SIGN)

        // Bad character
        val BAD_CHARACTER = createTextAttributesKey("PULSE_BAD_CHARACTER", HighlighterColors.BAD_CHARACTER)

        private val EMPTY_KEYS = emptyArray<TextAttributesKey>()
    }

    override fun getHighlightingLexer(): Lexer = PulseLexer()

    override fun getTokenHighlights(tokenType: IElementType?): Array<TextAttributesKey> {
        return when (tokenType) {
            PulseTokenTypes.COMMENT -> arrayOf(COMMENT)
            PulseTokenTypes.BLOCK_COMMENT -> arrayOf(BLOCK_COMMENT)
            PulseTokenTypes.STRING -> arrayOf(STRING)
            PulseTokenTypes.NUMBER -> arrayOf(NUMBER)
            PulseTokenTypes.KEYWORD -> arrayOf(KEYWORD)
            PulseTokenTypes.BLOCK_KEYWORD -> arrayOf(BLOCK_KEYWORD)
            PulseTokenTypes.CONSTANT -> arrayOf(CONSTANT)
            PulseTokenTypes.IDENTIFIER -> arrayOf(IDENTIFIER)
            PulseTokenTypes.COMPONENT -> arrayOf(COMPONENT)
            PulseTokenTypes.DIRECTIVE -> arrayOf(DIRECTIVE)
            PulseTokenTypes.SLOT -> arrayOf(SLOT)
            PulseTokenTypes.CLASS_SELECTOR -> arrayOf(CLASS_SELECTOR)
            PulseTokenTypes.ID_SELECTOR -> arrayOf(ID_SELECTOR)
            PulseTokenTypes.LBRACE, PulseTokenTypes.RBRACE -> arrayOf(BRACES)
            PulseTokenTypes.LBRACKET, PulseTokenTypes.RBRACKET -> arrayOf(BRACKETS)
            PulseTokenTypes.LPAREN, PulseTokenTypes.RPAREN -> arrayOf(PARENTHESES)
            PulseTokenTypes.OPERATOR -> arrayOf(OPERATOR)
            PulseTokenTypes.BAD_CHARACTER -> arrayOf(BAD_CHARACTER)
            else -> EMPTY_KEYS
        }
    }
}

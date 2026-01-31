package com.pulse.intellij

import com.intellij.psi.tree.IElementType
import com.intellij.psi.tree.TokenSet

object PulseTokenTypes {
    // Comments
    val COMMENT = IElementType("COMMENT", PulseLanguage)
    val BLOCK_COMMENT = IElementType("BLOCK_COMMENT", PulseLanguage)

    // Literals
    val STRING = IElementType("STRING", PulseLanguage)
    val NUMBER = IElementType("NUMBER", PulseLanguage)

    // Keywords
    val KEYWORD = IElementType("KEYWORD", PulseLanguage)
    val BLOCK_KEYWORD = IElementType("BLOCK_KEYWORD", PulseLanguage)
    val CONSTANT = IElementType("CONSTANT", PulseLanguage)

    // Identifiers
    val IDENTIFIER = IElementType("IDENTIFIER", PulseLanguage)
    val COMPONENT = IElementType("COMPONENT", PulseLanguage)
    val DIRECTIVE = IElementType("DIRECTIVE", PulseLanguage)
    val SLOT = IElementType("SLOT", PulseLanguage)

    // Selectors
    val CLASS_SELECTOR = IElementType("CLASS_SELECTOR", PulseLanguage)
    val ID_SELECTOR = IElementType("ID_SELECTOR", PulseLanguage)

    // Brackets
    val LBRACE = IElementType("LBRACE", PulseLanguage)
    val RBRACE = IElementType("RBRACE", PulseLanguage)
    val LBRACKET = IElementType("LBRACKET", PulseLanguage)
    val RBRACKET = IElementType("RBRACKET", PulseLanguage)
    val LPAREN = IElementType("LPAREN", PulseLanguage)
    val RPAREN = IElementType("RPAREN", PulseLanguage)

    // Operators
    val OPERATOR = IElementType("OPERATOR", PulseLanguage)

    // Other
    val WHITESPACE = IElementType("WHITESPACE", PulseLanguage)
    val BAD_CHARACTER = IElementType("BAD_CHARACTER", PulseLanguage)

    // Token sets for syntax highlighting
    val COMMENTS = TokenSet.create(COMMENT, BLOCK_COMMENT)
    val STRINGS = TokenSet.create(STRING)
    val KEYWORDS = TokenSet.create(KEYWORD, BLOCK_KEYWORD)
    val BRACES = TokenSet.create(LBRACE, RBRACE)
    val BRACKETS = TokenSet.create(LBRACKET, RBRACKET)
    val PARENTHESES = TokenSet.create(LPAREN, RPAREN)
}

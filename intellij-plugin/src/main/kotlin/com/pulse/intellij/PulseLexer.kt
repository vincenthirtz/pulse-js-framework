package com.pulse.intellij

import com.intellij.lexer.LexerBase
import com.intellij.psi.tree.IElementType

class PulseLexer : LexerBase() {
    private var buffer: CharSequence = ""
    private var startOffset: Int = 0
    private var endOffset: Int = 0
    private var currentOffset: Int = 0
    private var currentTokenType: IElementType? = null
    private var currentTokenEnd: Int = 0

    override fun start(buffer: CharSequence, startOffset: Int, endOffset: Int, initialState: Int) {
        this.buffer = buffer
        this.startOffset = startOffset
        this.endOffset = endOffset
        this.currentOffset = startOffset
        advance()
    }

    override fun getState(): Int = 0

    override fun getTokenType(): IElementType? = currentTokenType

    override fun getTokenStart(): Int = currentOffset

    override fun getTokenEnd(): Int = currentTokenEnd

    override fun advance() {
        if (currentTokenEnd >= endOffset) {
            currentTokenType = null
            return
        }

        currentOffset = currentTokenEnd

        if (currentOffset >= endOffset) {
            currentTokenType = null
            return
        }

        val c = buffer[currentOffset]

        when {
            // Line comment
            c == '/' && currentOffset + 1 < endOffset && buffer[currentOffset + 1] == '/' -> {
                currentTokenEnd = findLineEnd()
                currentTokenType = PulseTokenTypes.COMMENT
            }
            // Block comment
            c == '/' && currentOffset + 1 < endOffset && buffer[currentOffset + 1] == '*' -> {
                currentTokenEnd = findBlockCommentEnd()
                currentTokenType = PulseTokenTypes.BLOCK_COMMENT
            }
            // String
            c == '"' || c == '\'' -> {
                currentTokenEnd = findStringEnd(c)
                currentTokenType = PulseTokenTypes.STRING
            }
            // Number
            c.isDigit() -> {
                currentTokenEnd = findNumberEnd()
                currentTokenType = PulseTokenTypes.NUMBER
            }
            // Template string
            c == '`' -> {
                currentTokenEnd = findTemplateStringEnd()
                currentTokenType = PulseTokenTypes.STRING
            }
            // Directive (@)
            c == '@' -> {
                currentTokenEnd = findIdentifierEnd(currentOffset + 1)
                val name = if (currentTokenEnd > currentOffset + 1)
                    buffer.substring(currentOffset + 1, currentTokenEnd) else ""
                currentTokenType = when (name) {
                    "click", "dblclick", "input", "change", "submit", "blur", "focus",
                    "keydown", "keyup", "keypress", "mouseenter", "mouseleave",
                    "mouseover", "mouseout", "mousedown", "mouseup", "wheel",
                    "scroll", "resize", "dragenter", "dragover", "dragleave",
                    "dragstart", "dragend", "drop", "touchstart", "touchend",
                    "touchmove", "contextmenu", "pointerdown", "pointerup",
                    "pointermove", "pointerenter", "pointerleave",
                    "on", "bind", "model" -> PulseTokenTypes.EVENT_DIRECTIVE
                    "a11y", "live", "focusTrap", "srOnly" -> PulseTokenTypes.A11Y_DIRECTIVE
                    "link", "navigate", "outlet", "back", "forward" -> PulseTokenTypes.ROUTER_DIRECTIVE
                    "mount", "unmount" -> PulseTokenTypes.LIFECYCLE_DIRECTIVE
                    "if", "else", "else-if", "for", "each" -> PulseTokenTypes.CONTROL_FLOW
                    "slot" -> PulseTokenTypes.SLOT
                    "page", "component", "route" -> PulseTokenTypes.BLOCK_KEYWORD
                    else -> PulseTokenTypes.DIRECTIVE
                }
            }
            // Identifier or keyword
            c.isLetter() || c == '_' -> {
                currentTokenEnd = findIdentifierEnd(currentOffset)
                val text = buffer.substring(currentOffset, currentTokenEnd)
                currentTokenType = when (text) {
                    "import", "from", "as", "export" -> PulseTokenTypes.KEYWORD
                    "state", "props", "view", "style", "actions",
                    "router", "store", "routes", "getters" -> PulseTokenTypes.BLOCK_KEYWORD
                    "true", "false", "null", "undefined" -> PulseTokenTypes.CONSTANT
                    "if", "else", "return", "this", "const", "let", "var",
                    "function", "async", "await", "new", "typeof",
                    "instanceof", "in", "of" -> PulseTokenTypes.KEYWORD
                    "slot" -> PulseTokenTypes.SLOT
                    else -> if (text[0].isUpperCase()) PulseTokenTypes.COMPONENT else PulseTokenTypes.IDENTIFIER
                }
            }
            // Class selector
            c == '.' && currentOffset + 1 < endOffset && buffer[currentOffset + 1].isLetter() -> {
                currentTokenEnd = findIdentifierEnd(currentOffset + 1)
                currentTokenType = PulseTokenTypes.CLASS_SELECTOR
            }
            // ID selector
            c == '#' && currentOffset + 1 < endOffset && buffer[currentOffset + 1].isLetter() -> {
                currentTokenEnd = findIdentifierEnd(currentOffset + 1)
                currentTokenType = PulseTokenTypes.ID_SELECTOR
            }
            // Brackets
            c == '{' -> {
                currentTokenEnd = currentOffset + 1
                currentTokenType = PulseTokenTypes.LBRACE
            }
            c == '}' -> {
                currentTokenEnd = currentOffset + 1
                currentTokenType = PulseTokenTypes.RBRACE
            }
            c == '[' -> {
                currentTokenEnd = currentOffset + 1
                currentTokenType = PulseTokenTypes.LBRACKET
            }
            c == ']' -> {
                currentTokenEnd = currentOffset + 1
                currentTokenType = PulseTokenTypes.RBRACKET
            }
            c == '(' -> {
                currentTokenEnd = currentOffset + 1
                currentTokenType = PulseTokenTypes.LPAREN
            }
            c == ')' -> {
                currentTokenEnd = currentOffset + 1
                currentTokenType = PulseTokenTypes.RPAREN
            }
            // Comma and semicolon
            c == ',' || c == ';' -> {
                currentTokenEnd = currentOffset + 1
                currentTokenType = PulseTokenTypes.OPERATOR
            }
            // Operators
            c == ':' || c == '=' || c == '+' || c == '-' || c == '*' ||
            c == '/' || c == '<' || c == '>' || c == '!' || c == '&' || c == '|' ||
            c == '?' || c == '%' || c == '^' || c == '~' -> {
                currentTokenEnd = findOperatorEnd()
                currentTokenType = PulseTokenTypes.OPERATOR
            }
            // Whitespace
            c.isWhitespace() -> {
                currentTokenEnd = findWhitespaceEnd()
                currentTokenType = PulseTokenTypes.WHITESPACE
            }
            // Other
            else -> {
                currentTokenEnd = currentOffset + 1
                currentTokenType = PulseTokenTypes.BAD_CHARACTER
            }
        }
    }

    private fun findLineEnd(): Int {
        var pos = currentOffset
        while (pos < endOffset && buffer[pos] != '\n') pos++
        return pos
    }

    private fun findBlockCommentEnd(): Int {
        var pos = currentOffset + 2
        while (pos + 1 < endOffset) {
            if (buffer[pos] == '*' && buffer[pos + 1] == '/') {
                return pos + 2
            }
            pos++
        }
        return endOffset
    }

    private fun findStringEnd(quote: Char): Int {
        var pos = currentOffset + 1
        while (pos < endOffset) {
            val c = buffer[pos]
            if (c == '\\' && pos + 1 < endOffset) {
                pos += 2
                continue
            }
            if (c == quote) {
                return pos + 1
            }
            pos++
        }
        return endOffset
    }

    private fun findNumberEnd(): Int {
        var pos = currentOffset
        while (pos < endOffset && (buffer[pos].isDigit() || buffer[pos] == '.')) pos++
        return pos
    }

    private fun findIdentifierEnd(start: Int): Int {
        var pos = start
        while (pos < endOffset && (buffer[pos].isLetterOrDigit() || buffer[pos] == '_' || buffer[pos] == '-')) pos++
        return pos
    }

    private fun findTemplateStringEnd(): Int {
        var pos = currentOffset + 1
        while (pos < endOffset) {
            val ch = buffer[pos]
            if (ch == '\\' && pos + 1 < endOffset) {
                pos += 2
                continue
            }
            if (ch == '`') {
                return pos + 1
            }
            pos++
        }
        return endOffset
    }

    private fun findOperatorEnd(): Int {
        var pos = currentOffset + 1
        val c = buffer[currentOffset]
        if (pos < endOffset) {
            val next = buffer[pos]
            // Two-character operators
            if ((c == '=' && next == '=') || (c == '!' && next == '=') ||
                (c == '<' && next == '=') || (c == '>' && next == '=') ||
                (c == '&' && next == '&') || (c == '|' && next == '|') ||
                (c == '+' && next == '+') || (c == '-' && next == '-') ||
                (c == '?' && next == '?') || (c == '?' && next == '.') ||
                (c == '=' && next == '>') || (c == '*' && next == '*')) {
                pos++
                // Three-character operators (===, !==, ??=, ||=, &&=)
                if (pos < endOffset) {
                    if ((c == '=' || c == '!') && buffer[pos] == '=') pos++
                    else if (c == '?' && next == '?' && buffer[pos] == '=') pos++
                    else if (c == '|' && next == '|' && buffer[pos] == '=') pos++
                    else if (c == '&' && next == '&' && buffer[pos] == '=') pos++
                }
            }
            // Compound assignment (+=, -=, *=, /=, %=, ^=)
            else if (next == '=' && (c == '+' || c == '-' || c == '*' || c == '/' || c == '%' || c == '^')) {
                pos++
            }
        }
        return pos
    }

    private fun findWhitespaceEnd(): Int {
        var pos = currentOffset
        while (pos < endOffset && buffer[pos].isWhitespace()) pos++
        return pos
    }

    override fun getBufferSequence(): CharSequence = buffer

    override fun getBufferEnd(): Int = endOffset
}

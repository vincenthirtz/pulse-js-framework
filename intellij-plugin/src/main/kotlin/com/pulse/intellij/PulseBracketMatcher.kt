package com.pulse.intellij

import com.intellij.lang.BracePair
import com.intellij.lang.PairedBraceMatcher
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.IElementType

class PulseBracketMatcher : PairedBraceMatcher {
    companion object {
        private val BRACE_PAIRS = arrayOf(
            BracePair(PulseTokenTypes.LBRACE, PulseTokenTypes.RBRACE, true),
            BracePair(PulseTokenTypes.LBRACKET, PulseTokenTypes.RBRACKET, false),
            BracePair(PulseTokenTypes.LPAREN, PulseTokenTypes.RPAREN, false)
        )
    }

    override fun getPairs(): Array<BracePair> = BRACE_PAIRS

    override fun isPairedBracesAllowedBeforeType(lbraceType: IElementType, contextType: IElementType?): Boolean = true

    override fun getCodeConstructStart(file: PsiFile?, openingBraceOffset: Int): Int = openingBraceOffset
}

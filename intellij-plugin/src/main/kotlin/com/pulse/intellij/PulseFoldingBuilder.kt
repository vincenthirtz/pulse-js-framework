package com.pulse.intellij

import com.intellij.lang.ASTNode
import com.intellij.lang.folding.FoldingBuilderEx
import com.intellij.lang.folding.FoldingDescriptor
import com.intellij.openapi.editor.Document
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.util.PsiTreeUtil

class PulseFoldingBuilder : FoldingBuilderEx() {
    companion object {
        private val FOLDABLE_BLOCKS = setOf(
            "state", "props", "view", "style", "actions",
            "router", "store", "routes", "getters"
        )
    }

    override fun buildFoldRegions(root: PsiElement, document: Document, quick: Boolean): Array<FoldingDescriptor> {
        val descriptors = mutableListOf<FoldingDescriptor>()
        val text = document.text

        // Find all block patterns: keyword {
        val pattern = Regex("\\b(${FOLDABLE_BLOCKS.joinToString("|")})\\s*\\{")

        pattern.findAll(text).forEach { match ->
            val startOffset = match.range.last
            val endOffset = findMatchingBrace(text, startOffset)

            if (endOffset > startOffset) {
                val range = TextRange(match.range.first, endOffset + 1)
                val node = root.node
                if (node != null) {
                    descriptors.add(FoldingDescriptor(node, range))
                }
            }
        }

        return descriptors.toTypedArray()
    }

    private fun findMatchingBrace(text: String, openBraceOffset: Int): Int {
        var depth = 1
        var pos = openBraceOffset + 1

        while (pos < text.length && depth > 0) {
            when (text[pos]) {
                '{' -> depth++
                '}' -> depth--
            }
            if (depth > 0) pos++
        }

        return if (depth == 0) pos else -1
    }

    override fun getPlaceholderText(node: ASTNode): String = "{...}"

    override fun isCollapsedByDefault(node: ASTNode): Boolean = false
}

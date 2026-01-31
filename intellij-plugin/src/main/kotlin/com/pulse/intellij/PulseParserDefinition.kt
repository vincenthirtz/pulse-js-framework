package com.pulse.intellij

import com.intellij.lang.ASTNode
import com.intellij.lang.ParserDefinition
import com.intellij.lang.PsiParser
import com.intellij.lexer.Lexer
import com.intellij.openapi.project.Project
import com.intellij.psi.FileViewProvider
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.IFileElementType
import com.intellij.psi.tree.TokenSet

class PulseParserDefinition : ParserDefinition {
    companion object {
        val FILE = IFileElementType(PulseLanguage)
    }

    override fun createLexer(project: Project?): Lexer = PulseLexer()

    override fun createParser(project: Project?): PsiParser = PulseParser()

    override fun getFileNodeType(): IFileElementType = FILE

    override fun getCommentTokens(): TokenSet = PulseTokenTypes.COMMENTS

    override fun getStringLiteralElements(): TokenSet = PulseTokenTypes.STRINGS

    override fun createElement(node: ASTNode?): PsiElement {
        throw UnsupportedOperationException("Not implemented")
    }

    override fun createFile(viewProvider: FileViewProvider): PsiFile = PulseFile(viewProvider)
}

package com.pulse.intellij

import com.intellij.extapi.psi.PsiFileBase
import com.intellij.openapi.fileTypes.FileType
import com.intellij.psi.FileViewProvider

class PulseFile(viewProvider: FileViewProvider) : PsiFileBase(viewProvider, PulseLanguage) {
    override fun getFileType(): FileType = PulseFileType

    override fun toString(): String = "Pulse File"
}

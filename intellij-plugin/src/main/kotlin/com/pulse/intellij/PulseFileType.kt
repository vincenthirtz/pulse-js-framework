package com.pulse.intellij

import com.intellij.openapi.fileTypes.LanguageFileType
import javax.swing.Icon

object PulseFileType : LanguageFileType(PulseLanguage) {
    override fun getName(): String = "Pulse"

    override fun getDescription(): String = "Pulse framework file"

    override fun getDefaultExtension(): String = "pulse"

    override fun getIcon(): Icon = PulseIcons.FILE
}

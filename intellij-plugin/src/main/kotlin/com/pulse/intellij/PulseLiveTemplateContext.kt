package com.pulse.intellij

import com.intellij.codeInsight.template.TemplateActionContext
import com.intellij.codeInsight.template.TemplateContextType

class PulseLiveTemplateContext : TemplateContextType("Pulse") {

    override fun isInContext(templateActionContext: TemplateActionContext): Boolean {
        val file = templateActionContext.file
        return file.name.endsWith(".pulse") || file.fileType == PulseFileType
    }
}

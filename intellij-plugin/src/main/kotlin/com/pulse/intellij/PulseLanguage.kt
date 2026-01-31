package com.pulse.intellij

import com.intellij.lang.Language

object PulseLanguage : Language("Pulse") {
    private fun readResolve(): Any = PulseLanguage

    override fun getDisplayName(): String = "Pulse"

    override fun isCaseSensitive(): Boolean = true
}

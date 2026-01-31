plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.21"
    id("org.jetbrains.intellij") version "1.16.1"
}

group = "com.pulse"
version = "1.0.0"

repositories {
    mavenCentral()
}

kotlin {
    jvmToolchain(17)
}

intellij {
    version.set("2023.3")
    type.set("IC") // IntelliJ IDEA Community Edition

    // Plugins required for TextMate bundle support
    plugins.set(listOf("org.jetbrains.plugins.textmate"))
}

tasks {
    patchPluginXml {
        sinceBuild.set("233")
        untilBuild.set("243.*")

        pluginDescription.set("""
            <h2>Pulse Language Support</h2>
            <p>Provides comprehensive support for the Pulse framework (.pulse files):</p>
            <ul>
                <li><b>Syntax Highlighting</b> - Full highlighting for Pulse DSL</li>
                <li><b>Live Templates</b> - Code snippets for common patterns</li>
                <li><b>File Icons</b> - Custom icons for .pulse files</li>
                <li><b>Code Folding</b> - Fold state, view, style blocks</li>
                <li><b>Comment Support</b> - Line and block comments</li>
                <li><b>Bracket Matching</b> - Auto-closing pairs</li>
            </ul>
            <p>Learn more at <a href="https://github.com/vincenthirtz/pulse-js-framework">GitHub</a></p>
        """.trimIndent())

        changeNotes.set("""
            <h3>1.0.0</h3>
            <ul>
                <li>Initial release</li>
                <li>Syntax highlighting for .pulse files</li>
                <li>17 code snippets (Live Templates)</li>
                <li>Custom file icons</li>
            </ul>
        """.trimIndent())
    }

    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }

    publishPlugin {
        token.set(System.getenv("PUBLISH_TOKEN"))
    }

    buildSearchableOptions {
        enabled = false
    }
}

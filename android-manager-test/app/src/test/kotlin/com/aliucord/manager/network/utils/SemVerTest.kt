package com.aliucord.manager.network.utils

import dev.raincord.manager.BuildConfig
import org.junit.Assert.*
import org.junit.Test

class SemVerTest {
    @Test fun builtManagerVersionCanBeStoredInInstallationMetadata() {
        val version = SemVer.parse(BuildConfig.VERSION_NAME)
        assertEquals(version, SemVer.parse(version.toString()))
    }

    @Test fun testSuffixWouldBreakMetadataAndMustNotReturn() {
        assertNull(SemVer.parseOrNull("v1.0.1-cloudcord-test1"))
        assertEquals("1.0.2", SemVer.parse("v1.0.2").toString())
    }
}

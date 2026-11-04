package com.aliucord.manager.patcher.util

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ClientPackagePolicyTest {
    private val manager = "gg.xohus.cloudcord.manager.preview"

    @Test fun allowsIndependentClientInstances() {
        for (name in listOf("gg.xohus.cloudcord.client.test", "gg.xohus.cloudcord.client.second", "my.custom.discordclient")) {
            assertTrue(name, ClientPackagePolicy.isAllowed(name, manager))
        }
    }

    @Test fun protectsDiscordAndManager() {
        for (name in listOf("com.discord", "com.discord.beta", "com.discord.canary", manager)) {
            assertFalse(name, ClientPackagePolicy.isAllowed(name, manager))
        }
    }

    @Test fun rejectsMalformedNames() {
        for (name in listOf("", "discord", "my..client", "my.1client", "my.client ", "my/client", "my." + "a".repeat(151))) {
            assertFalse(name, ClientPackagePolicy.isAllowed(name, manager))
        }
    }
}

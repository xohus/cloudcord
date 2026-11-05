package com.aliucord.manager.installers.pm

import android.content.pm.PackageInstaller
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PMInstallerErrorTest {
    @Test fun preservesPackageManagerFailure() {
        val reason = "INSTALL_FAILED_INVALID_APK: Failed to extract native libraries, res=-2"
        assertTrue(PMInstallerError(PackageInstaller.STATUS_FAILURE_INVALID, reason)
            .getDebugReason().endsWith(reason))
    }

    @Test fun missingDetailsStillHaveStatus() {
        assertEquals("Invalid package (status 4)", PMInstallerError(4).getDebugReason())
        assertEquals("Invalid package (status 4)", PMInstallerError(4, "  ").getDebugReason())
    }
}

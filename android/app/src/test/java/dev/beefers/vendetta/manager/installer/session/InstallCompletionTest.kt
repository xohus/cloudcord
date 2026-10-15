package dev.beefers.vendetta.manager.installer.session

import android.content.pm.PackageInstaller
import org.junit.Assert.*
import org.junit.Test

class InstallCompletionTest {
    @Test fun submissionAndUserPromptAreNotSuccess() {
        val result = InstallCompletion.register(101)
        try {
            assertFalse(result.isCompleted)
            InstallCompletion.finish(101, PackageInstaller.STATUS_PENDING_USER_ACTION, null)
            assertFalse(result.isCompleted)
            InstallCompletion.finish(101, PackageInstaller.STATUS_SUCCESS, null)
            assertTrue(result.isCompleted)
            assertFalse(result.isCancelled)
        } finally { InstallCompletion.forget(101) }
    }

    @Test fun rejectedInstallationFails() {
        val result = InstallCompletion.register(102)
        InstallCompletion.finish(102, PackageInstaller.STATUS_FAILURE_BLOCKED, "Blocked")
        assertTrue(result.isCompleted)
        assertTrue(result.isCancelled)
    }

    @Test fun sessionsAreIsolatedAndCancellationRemovesPendingWork() {
        val first = InstallCompletion.register(103)
        val second = InstallCompletion.register(104)
        InstallCompletion.finish(103, PackageInstaller.STATUS_SUCCESS, null)
        assertTrue(first.isCompleted)
        assertFalse(second.isCompleted)
        InstallCompletion.forget(104)
        assertTrue(second.isCancelled)
        InstallCompletion.finish(104, PackageInstaller.STATUS_SUCCESS, null)
        assertTrue(second.isCancelled)
    }
}

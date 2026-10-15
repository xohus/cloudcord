package dev.beefers.vendetta.manager.installer.session

import android.content.pm.PackageInstaller
import kotlinx.coroutines.CompletableDeferred
import java.util.concurrent.ConcurrentHashMap

/** A submitted package session is not a successful installation. */
internal object InstallCompletion {
    private val pending = ConcurrentHashMap<Int, CompletableDeferred<Unit>>()

    fun register(sessionId: Int): CompletableDeferred<Unit> = CompletableDeferred<Unit>().also {
        check(pending.putIfAbsent(sessionId, it) == null) { "Installation session already registered" }
    }

    fun finish(sessionId: Int, status: Int, message: String?) {
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) return
        val completion = pending.remove(sessionId) ?: return
        if (status == PackageInstaller.STATUS_SUCCESS) completion.complete(Unit)
        else completion.completeExceptionally(IllegalStateException(
            "Android installation failed (status $status): ${message ?: "No details provided"}"
        ))
    }

    fun forget(sessionId: Int) { pending.remove(sessionId)?.cancel() }
}

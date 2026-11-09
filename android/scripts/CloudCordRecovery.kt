package io.github.revenge.xposed

import android.app.Activity
import android.app.AlertDialog
import android.view.KeyEvent
import android.view.Window
import io.github.revenge.xposed.modules.UpdaterModule

/** Recovery entry point that does not depend on React Native or the runtime. */
internal object CloudCordRecovery {
    fun attach(activity: Activity) {
        val window = activity.window ?: return
        fun wrapCallback() {
            val callback = window.callback ?: return
            if (callback !is RecoveryCallback) window.callback = RecoveryCallback(activity, callback)
        }
        wrapCallback()
        // Discord can replace the callback after onCreate while setting up its window.
        window.decorView.viewTreeObserver.addOnWindowFocusChangeListener { focused ->
            if (focused) wrapCallback()
        }
    }

    private class RecoveryCallback(
        private val activity: Activity,
        private val delegate: Window.Callback,
    ) : Window.Callback by delegate {
        private var openedForPress = false

        override fun dispatchKeyEvent(event: KeyEvent): Boolean {
            if (event.keyCode == KeyEvent.KEYCODE_VOLUME_UP && event.action == KeyEvent.ACTION_DOWN) {
                if (event.repeatCount == 0) {
                    openedForPress = false
                } else if (!openedForPress && (event.isLongPress || event.eventTime - event.downTime >= 1200)) {
                    openedForPress = true
                    activity.window.decorView.post {
                        if (activity.isFinishing || activity.isDestroyed || !activity.hasWindowFocus()) return@post
                        AlertDialog.Builder(activity)
                            .setTitle("CloudCord recovery")
                            .setMessage("Download a verified CloudCord update without reinstalling Discord.")
                            .setNegativeButton(android.R.string.cancel, null)
                            .setPositiveButton("Download update") { _, _ ->
                                UpdaterModule.downloadScript(activity, officialOnly = true)
                            }
                            .show()
                    }
                }
            }
            return delegate.dispatchKeyEvent(event)
        }
    }
}

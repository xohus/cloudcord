package io.github.revenge.xposed.modules

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.util.AtomicFile
import android.widget.Toast
import de.robv.android.xposed.callbacks.XC_LoadPackage
import dev.rushii.libunbound.LibUnbound
import io.github.revenge.xposed.Constants
import io.github.revenge.xposed.Module
import io.github.revenge.xposed.Utils
import io.github.revenge.xposed.Utils.Companion.JSON
import io.github.revenge.xposed.Utils.Companion.reloadApp
import io.github.revenge.xposed.Utils.Log
import io.github.revenge.xposed.modules.bridge.BridgeModule
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import java.io.File
import java.lang.ref.WeakReference
import java.security.MessageDigest

@Serializable
data class CustomLoadUrl(val enabled: Boolean = false, val url: String = "")

@Serializable
data class LoaderConfig(val customLoadUrl: CustomLoadUrl = CustomLoadUrl(), val disableInjection: Boolean = false)

@Serializable
data class EndpointInfo(val paths: ArrayList<String>, val hash: String? = null, val version: String)

@Serializable
data class RuntimeManifest(val schema: Int = 1, val version: String, val url: String, val sha256: String, val size: Long)

data class ResolvedBundle(val url: String, val sha256: String? = null, val size: Long? = null)

object UpdaterModule : Module() {
    private lateinit var config: LoaderConfig
    val isCustomUrlEnabled: Boolean
        get() = config.customLoadUrl.enabled
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var lastActivity: WeakReference<Activity>? = null

    private lateinit var cacheDir: File
    private lateinit var bundle: File
    private lateinit var etag: File

    private const val TIMEOUT_STRICT = 15000L
    private const val MIN_BYTECODE_SIZE = 512
    private const val ETAG_FILE = "etag.txt"
    private const val CONFIG_FILE = "loader.json"

    private const val DEFAULT_MANIFEST_URL = "https://raw.githubusercontent.com/xohus/cloudcord/main/dist/runtime-manifest.json"
    private const val MAX_BUNDLE_SIZE = 8 * 1024 * 1024

    override fun onLoad(packageParam: XC_LoadPackage.LoadPackageParam) = with(packageParam) {
        cacheDir = File(appInfo.dataDir, Constants.CACHE_DIR).apply { mkdirs() }
        val filesDir = File(appInfo.dataDir, Constants.FILES_DIR).apply { mkdirs() }

        bundle = File(cacheDir, Constants.MAIN_SCRIPT_FILE)
        etag = File(cacheDir, ETAG_FILE)

        val configFile = File(filesDir, CONFIG_FILE)
        config = runCatching {
            if (configFile.exists()) JSON.decodeFromString<LoaderConfig>(configFile.readText()) else LoaderConfig()
        }.getOrDefault(LoaderConfig())

        BridgeModule.registerMethod("revenge.updater.clear") {
            if (bundle.exists()) bundle.delete()
            if (etag.exists()) etag.delete()
            null
        }
    }

    private val downloadMutex = Mutex()

    fun downloadScript(activity: Activity? = null, showUpdateDialog: Boolean = true, officialOnly: Boolean = false): Job =
        scope.launch { downloadMutex.withLock { download(activity, showUpdateDialog, officialOnly) } }

    private suspend fun download(activity: Activity?, showUpdateDialog: Boolean, officialOnly: Boolean) {
        try {
            HttpClient(CIO) {
                expectSuccess = false
                install(HttpTimeout) {
                    requestTimeoutMillis = TIMEOUT_STRICT
                    connectTimeoutMillis = 5000L
                    socketTimeoutMillis = TIMEOUT_STRICT
                }
                install(UserAgent) { agent = Constants.USER_AGENT }
                install(HttpRedirect) { checkHttpMethod = false }
            }.use { client ->
                val target = resolveTargetBundle(client, officialOnly)
                Log.i("Fetching verified CloudCord bundle: ${target.url}")

                val localMatches = target.sha256 == null || (bundle.exists() && sha256(bundle.readBytes()).equals(target.sha256, ignoreCase = true))
                if (!localMatches && etag.exists()) etag.delete()

                val response: HttpResponse = client.get(target.url) {
                    headers {
                        if (localMatches && etag.exists() && bundle.exists()) append(HttpHeaders.IfNoneMatch, etag.readText())
                    }
                }

                when (response.status) {
                    HttpStatusCode.OK -> {
                        val bytes: ByteArray = response.body()
                        if (bytes.size < MIN_BYTECODE_SIZE) throw Exception("Payload too small (${bytes.size} bytes).")
                        if (bytes.size > MAX_BUNDLE_SIZE) throw Exception("Payload too large (${bytes.size} bytes).")
                        if (target.size != null && bytes.size.toLong() != target.size) throw Exception("Runtime size does not match manifest.")
                        if (target.sha256 != null && !sha256(bytes).equals(target.sha256, ignoreCase = true)) throw Exception("Runtime SHA-256 does not match manifest.")

                        val source = bytes.toString(Charsets.UTF_8)
                        if (source.trimStart().startsWith("<") || (!source.contains("CloudCord") && !source.contains("cloudcord"))) throw Exception("Downloaded payload is not a CloudCord runtime.")

                        AtomicFile(bundle).apply {
                            val stream = startWrite()
                            try {
                                stream.write(bytes)
                                finishWrite(stream)
                            } catch (e: Exception) {
                                failWrite(stream)
                                throw e
                            }
                        }

                        response.headers[HttpHeaders.ETag]?.let { etag.writeText(it) } ?: etag.delete()
                        Log.i("Verified CloudCord bundle updated: ${bytes.size} bytes")

                        if (activity != null && showUpdateDialog) {
                            withContext(Dispatchers.Main) {
                                AlertDialog.Builder(activity)
                                    .setTitle("Update Successful")
                                    .setMessage("Verified update installed. Reload required.")
                                    .setPositiveButton("Reload") { _, _ -> reloadApp() }
                                    .setCancelable(false)
                                    .show()
                            }
                        }
                    }
                    HttpStatusCode.NotModified -> {
                        if (!localMatches || !bundle.exists()) throw Exception("Server returned 304 without a verified local runtime.")
                        Log.i("Verified CloudCord bundle is up to date (304)")
                        if (activity != null && showUpdateDialog) withContext(Dispatchers.Main) {
                            Toast.makeText(activity, "CloudCord is already up to date.", Toast.LENGTH_LONG).show()
                        }
                    }
                    else -> throw ResponseException(response, "HTTP ${response.status}")
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            Log.e("Updater Error", e)
            if (activity != null) withContext(Dispatchers.Main) {
                Toast.makeText(activity, "Update rejected; keeping the last working runtime: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private suspend fun resolveTargetBundle(client: HttpClient, officialOnly: Boolean): ResolvedBundle {
        if (!officialOnly && config.customLoadUrl.enabled && config.customLoadUrl.url.isNotEmpty()) return ResolvedBundle(config.customLoadUrl.url)
        val response = client.get(DEFAULT_MANIFEST_URL)
        if (response.status != HttpStatusCode.OK) throw ResponseException(response, "Could not fetch CloudCord runtime manifest")
        val manifest = JSON.decodeFromString<RuntimeManifest>(response.bodyAsText())
        if (manifest.schema != 1) throw Exception("Unsupported runtime manifest schema ${manifest.schema}.")
        if (!manifest.url.startsWith("https://raw.githubusercontent.com/xohus/cloudcord/")) throw Exception("Runtime manifest points to an untrusted host.")
        if (!manifest.sha256.matches(Regex("^[0-9a-fA-F]{64}$"))) throw Exception("Runtime manifest SHA-256 is invalid.")
        if (manifest.size < MIN_BYTECODE_SIZE || manifest.size > MAX_BUNDLE_SIZE) throw Exception("Runtime manifest size is invalid.")
        return ResolvedBundle(manifest.url, manifest.sha256.lowercase(), manifest.size)
    }

    private fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256")
        .digest(bytes)
        .joinToString("") { "%02x".format(it.toInt() and 0xff) }

    override fun onActivity(activity: Activity) {
        lastActivity = WeakReference(activity)
    }

    fun setDisableInjection(context: Context, disabled: Boolean) {
        val filesDir = File(context.dataDir, Constants.FILES_DIR).apply { mkdirs() }
        val configFile = File(filesDir, CONFIG_FILE)
        val newCfg = config.copy(disableInjection = disabled)
        configFile.writeText(JSON.encodeToString(newCfg))
        config = newCfg
        Toast.makeText(context, "Injection ${if (disabled) "disabled" else "enabled"}", Toast.LENGTH_SHORT).show()
    }

    fun isInjectionDisabled(context: Context? = null): Boolean {
        return if (::config.isInitialized) config.disableInjection else false
    }
}
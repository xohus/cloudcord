package dev.beefers.vendetta.manager.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Release(
    @SerialName("tag_name") val tagName: String,
    @SerialName("name") val versionName: String? = null,
    val assets: List<ReleaseAsset> = emptyList(),
) {
    // Manager releases are separate from client APK/runtime/desktop releases.
    val managerVersionCode: Int?
        get() = Regex("^manager-([0-9]+)$").matchEntire(tagName)?.groupValues?.get(1)?.toIntOrNull()

    val managerAsset: ReleaseAsset?
        get() = assets.singleOrNull {
            it.name == "CloudCordManager.apk" && it.size in 1L..200_000_000L &&
                it.downloadUrl == "https://github.com/xohus/cloudcord/releases/download/$tagName/CloudCordManager.apk" &&
                it.digest?.matches(Regex("^sha256:[0-9a-fA-F]{64}$")) == true
        }
}

@Serializable
data class ReleaseAsset(
    val name: String,
    @SerialName("browser_download_url") val downloadUrl: String,
    val size: Long,
    val digest: String? = null,
)

package dev.beefers.vendetta.manager.network.dto

import org.junit.Assert.*
import org.junit.Test

class ReleaseTest {
    private val asset = ReleaseAsset("CloudCordManager.apk",
        "https://github.com/xohus/cloudcord/releases/download/manager-101/CloudCordManager.apk",
        1000, "sha256:" + "a".repeat(64))

    @Test fun acceptsOnlyManagerVersionTags() {
        assertEquals(101, Release("manager-101").managerVersionCode)
        for (tag in listOf("new_beta_android", "new_beta_t_desktop", "101", "manager-2147483648", "manager-1/x")) {
            assertNull(Release(tag).managerVersionCode)
        }
    }

    @Test fun acceptsPinnedManagerAsset() {
        assertEquals(asset, Release("manager-101", assets = listOf(asset)).managerAsset)
    }

    @Test fun rejectsWrongRepositoryOrTagOrAsset() {
        for (url in listOf("https://example.com/CloudCordManager.apk",
            asset.downloadUrl.replace("xohus", "someone"),
            asset.downloadUrl.replace("manager-101", "manager-102"))) {
            assertNull(Release("manager-101", assets = listOf(asset.copy(downloadUrl = url))).managerAsset)
        }
        assertNull(Release("manager-101", assets = listOf(asset.copy(name = "cloudcord.apk"))).managerAsset)
    }

    @Test fun rejectsMissingOrMalformedChecksum() {
        for (digest in listOf(null, "sha256:bad", "md5:" + "a".repeat(64))) {
            assertNull(Release("manager-101", assets = listOf(asset.copy(digest = digest))).managerAsset)
        }
    }

    @Test fun rejectsEmptyOversizedOrAmbiguousAssets() {
        for (size in listOf(0L, -1L, 200_000_001L)) {
            assertNull(Release("manager-101", assets = listOf(asset.copy(size = size))).managerAsset)
        }
        assertNull(Release("manager-101", assets = listOf(asset, asset)).managerAsset)
    }
}

package com.aliucord.manager.network.services

import com.aliucord.manager.network.models.GithubRelease
import com.aliucord.manager.network.models.ControlRepoEntry
import com.aliucord.manager.network.utils.ApiResponse

// Test builds cannot update themselves to upstream Raincord binaries or policy.
class RainCodebergService(private val http: HttpService) {
    suspend fun getManagerReleases(): ApiResponse<List<GithubRelease>> = ApiResponse.Success(emptyList())
    suspend fun getControlRepo(): ApiResponse<List<ControlRepoEntry>> = ApiResponse.Success(emptyList())
    suspend fun getLatestXposedRelease(): ApiResponse<GithubRelease> = ApiResponse.Success(
        GithubRelease(createdAt = "2026-10-16T00:00:00Z", assets = emptyList(), tagName = "1.0.0", name = "1.0.0")
    )
}

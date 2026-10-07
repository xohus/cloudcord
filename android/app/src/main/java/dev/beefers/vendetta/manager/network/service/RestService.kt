package dev.beefers.vendetta.manager.network.service

import dev.beefers.vendetta.manager.domain.manager.PreferenceManager
import dev.beefers.vendetta.manager.network.dto.Commit
import dev.beefers.vendetta.manager.network.dto.Index
import dev.beefers.vendetta.manager.network.dto.Release
import io.ktor.client.request.parameter
import io.ktor.client.request.url
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

import io.ktor.client.request.header
import io.ktor.client.plugins.timeout
import dev.beefers.vendetta.manager.network.utils.ApiResponse

class RestService(
    private val httpService: HttpService,
    private val prefs: PreferenceManager
) {

    suspend fun getLatestRelease(repo: String) = withContext(Dispatchers.IO) {
        httpService.request<Release> {
            url("https://cloudcord.xohus.lol/api/proxy/releases/latest")
            header("X-CC-Client", "1")
        }
    }

    suspend fun getLatestDiscordVersions() = withContext(Dispatchers.IO) {
        httpService.request<Index> {
            url("${prefs.mirror.baseUrl}/tracker/index")
        }
    }

    suspend fun getCommits(repo: String, page: Int = 1) = withContext(Dispatchers.IO) {
        val proxy = httpService.request<List<Commit>> {
            url("https://getcloudcord.com/api/proxy/commits")
            parameter("page", page.coerceAtLeast(1))
            header("X-CC-Client", "1")
            timeout { requestTimeoutMillis = 10_000 }
        }
        if (proxy is ApiResponse.Success) return@withContext proxy
        httpService.request<List<Commit>> {
            url("https://api.github.com/repos/xohus/cloudcord/commits")
            parameter("page", page.coerceAtLeast(1))
            parameter("per_page", 20)
            header("Accept", "application/vnd.github+json")
            header("User-Agent", "CloudCord-Android-Manager")
            timeout { requestTimeoutMillis = 15_000 }
        }
    }

}

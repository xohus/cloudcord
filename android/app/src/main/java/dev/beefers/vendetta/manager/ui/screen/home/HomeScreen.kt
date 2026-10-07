package dev.beefers.vendetta.manager.ui.screen.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.basicMarquee
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.paging.compose.collectAsLazyPagingItems
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import dev.beefers.vendetta.manager.BuildConfig
import dev.beefers.vendetta.manager.R
import dev.beefers.vendetta.manager.domain.manager.PreferenceManager
import dev.beefers.vendetta.manager.ui.components.SegmentedButton
import dev.beefers.vendetta.manager.ui.screen.installer.InstallerScreen
import dev.beefers.vendetta.manager.ui.screen.settings.SettingsScreen
import dev.beefers.vendetta.manager.ui.viewmodel.home.HomeViewModel
import dev.beefers.vendetta.manager.ui.widgets.AppIcon
import dev.beefers.vendetta.manager.ui.widgets.dialog.StoragePermissionsDialog
import dev.beefers.vendetta.manager.ui.widgets.home.CommitList
import dev.beefers.vendetta.manager.ui.widgets.updater.UpdateDialog
import dev.beefers.vendetta.manager.utils.Constants
import dev.beefers.vendetta.manager.utils.DiscordVersion
import dev.beefers.vendetta.manager.utils.navigate
import org.koin.compose.koinInject

class HomeScreen : Screen {

    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        val prefs: PreferenceManager = koinInject()
        val viewModel: HomeViewModel = koinScreenModel()

        val currentVersion = remember(viewModel.installManager.current?.longVersionCode) {
            DiscordVersion.fromVersionCode(viewModel.installManager.current?.longVersionCode.toString())
        }

        val latestVersion =
            remember(prefs.discordVersion, viewModel.discordVersions, prefs.channel) {
                when {
                    prefs.discordVersion.isBlank() -> viewModel.discordVersions?.get(prefs.channel)
                    else -> DiscordVersion.fromVersionCode(prefs.discordVersion)
                }
            }

        // == Dialogs == //

        StoragePermissionsDialog()

        if (
            viewModel.showUpdateDialog &&
            viewModel.release != null &&
            !BuildConfig.DEBUG
        ) {
            UpdateDialog(
                release = viewModel.release!!,
                isUpdating = viewModel.isUpdating,
                onDismiss = { viewModel.showUpdateDialog = false },
                onConfirm = {
                    viewModel.downloadAndInstallUpdate()
                }
            )
        }

        // == Screen == //

        Scaffold(
            topBar = { TitleBar() },
        ) { pv ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier
                    .padding(pv)
                    .padding(16.dp)
                    .fillMaxSize()
            ) {
                HeroSection(
                    prefs = prefs,
                    latestVersion = latestVersion,
                    currentVersion = currentVersion,
                    targetLoaded = viewModel.discordVersions != null,
                    onInstall = {
                        latestVersion?.let { navigator.navigate(InstallerScreen(it)) }
                    }
                )

                StatusSection(
                    currentVersion = currentVersion,
                    latestVersion = latestVersion,
                    targetLoaded = viewModel.discordVersions != null,
                    targetLabel = if (prefs.discordVersion.isNotBlank()) R.string.version_target else R.string.version_latest
                )

                QuickActions(viewModel = viewModel)

                ElevatedCard(
                    modifier = Modifier
                        .fillMaxSize()
                ) {
                    Text(
                        text = stringResource(R.string.home_updates_title),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(16.dp, 16.dp, 16.dp, 0.dp)
                    )
                    CommitList(
                        commits = viewModel.commits.collectAsLazyPagingItems()
                    )
                }
            }
        }
    }

    @Composable
    @OptIn(ExperimentalMaterial3Api::class)
    private fun TitleBar() {
        TopAppBar(
            title = { Text(stringResource(R.string.title_home)) },
            actions = { Actions() }
        )
    }

    @Composable
    private fun HeroSection(
        prefs: PreferenceManager,
        latestVersion: DiscordVersion?,
        currentVersion: DiscordVersion?,
        targetLoaded: Boolean,
        onInstall: () -> Unit
    ) {
        ElevatedCard(
            colors = CardDefaults.elevatedCardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(20.dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AppIcon(
                        customIcon = prefs.patchIcon,
                        releaseChannel = prefs.channel,
                        modifier = Modifier.size(64.dp)
                    )
                    Column(
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = stringResource(R.string.home_hero_title),
                            style = MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = stringResource(R.string.home_hero_subtitle),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.78f)
                        )
                    }
                }

                Button(
                    onClick = onInstall,
                    enabled = latestVersion != null && (prefs.allowDowngrade || latestVersion >= (currentVersion ?: Constants.DUMMY_VERSION)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val label = when {
                        latestVersion == null -> if (targetLoaded) R.string.msg_target_unavailable else R.string.msg_loading
                        currentVersion == null -> R.string.action_install_cloudcord
                        currentVersion == latestVersion -> R.string.action_reinstall_cloudcord
                        latestVersion > currentVersion -> R.string.action_update_cloudcord
                        else -> if (prefs.allowDowngrade) R.string.msg_downgrade else R.string.msg_downgrade_disallowed
                    }

                    Text(
                        text = stringResource(label),
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                        modifier = Modifier
                            .basicMarquee()
                            .fillMaxWidth()
                    )
                }
            }
        }
    }

    @Composable
    private fun StatusSection(
        currentVersion: DiscordVersion?,
        latestVersion: DiscordVersion?,
        targetLoaded: Boolean,
        targetLabel: Int
    ) {
        ElevatedCard(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = stringResource(R.string.home_status_title),
                    style = MaterialTheme.typography.titleMedium
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    VersionTile(
                        label = stringResource(R.string.version_current, ""),
                        value = currentVersion?.toString() ?: stringResource(R.string.home_not_installed),
                        modifier = Modifier.weight(1f)
                    )
                    VersionTile(
                        label = stringResource(targetLabel, ""),
                        value = latestVersion?.toString() ?: stringResource(if (targetLoaded) R.string.msg_target_unavailable else R.string.msg_loading),
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }

    @Composable
    private fun VersionTile(
        label: String,
        value: String,
        modifier: Modifier = Modifier
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(4.dp),
            modifier = modifier
        ) {
            Text(
                text = label.removeSuffix(": "),
                style = MaterialTheme.typography.labelMedium,
                color = LocalContentColor.current.copy(alpha = 0.58f),
                maxLines = 1,
                modifier = Modifier.basicMarquee()
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 1,
                modifier = Modifier.basicMarquee()
            )
        }
    }

    @Composable
    private fun QuickActions(viewModel: HomeViewModel) {
        AnimatedVisibility(visible = viewModel.installManager.current != null) {
            ElevatedCard(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = stringResource(R.string.home_actions_title),
                        style = MaterialTheme.typography.titleMedium
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(2.dp),
                        modifier = Modifier.clip(RoundedCornerShape(16.dp))
                    ) {
                        SegmentedButton(
                            icon = Icons.AutoMirrored.Filled.OpenInNew,
                            text = stringResource(R.string.action_launch),
                            onClick = { viewModel.launchVendetta() }
                        )
                        SegmentedButton(
                            icon = Icons.Filled.Info,
                            text = stringResource(R.string.action_info),
                            onClick = { viewModel.launchVendettaInfo() }
                        )
                        SegmentedButton(
                            icon = Icons.Filled.Delete,
                            text = stringResource(R.string.action_uninstall),
                            onClick = { viewModel.uninstallVendetta() }
                        )
                    }
                }
            }
        }
    }

    @Composable
    private fun Actions() {
        val viewModel: HomeViewModel = koinScreenModel()
        val navigator = LocalNavigator.currentOrThrow

        IconButton(onClick = { viewModel.getDiscordVersions() }) {
            Icon(
                imageVector = Icons.Filled.Refresh,
                contentDescription = stringResource(R.string.action_reload)
            )
        }
        IconButton(onClick = { navigator.navigate(SettingsScreen()) }) {
            Icon(
                imageVector = Icons.Outlined.Settings,
                contentDescription = stringResource(R.string.action_open_settings)
            )
        }
    }

}

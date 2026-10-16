package com.aliucord.manager.patcher.steps.prepare

import com.aliucord.manager.network.services.RNATrackerService
import com.aliucord.manager.network.utils.getOrThrow
import com.aliucord.manager.patcher.StepRunner
import com.aliucord.manager.patcher.steps.StepGroup
import com.aliucord.manager.patcher.steps.base.Step
import com.aliucord.manager.ui.screens.patchopts.PatchOptions
import dev.raincord.manager.R
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import kotlin.properties.Delegates

class FetchDiscordRNAStep(val options: PatchOptions) : Step(), KoinComponent {
    private val tracker: RNATrackerService by inject()
    override val group = StepGroup.Prepare
    override val localizedName = R.string.patch_step_fetch_rna
    var targetVersion by Delegates.notNull<Int>()
        private set
    override suspend fun execute(container: StepRunner) {
        targetVersion = if (options.isDevMode && options.customVersionCode.isNotBlank()) {
            options.customVersionCode.toInt()
        } else {
            tracker.getLatestDiscordVersions().getOrThrow().latest.stable
        }
        check(targetVersion > 0) { "No valid Discord version available" }
        container.log("CloudCord test target Discord version: $targetVersion")
    }
}

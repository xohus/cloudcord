package com.aliucord.manager.patcher.steps.install

import com.aliucord.manager.manager.PathManager
import com.aliucord.manager.patcher.StepRunner
import com.aliucord.manager.patcher.steps.StepGroup
import com.aliucord.manager.patcher.steps.base.Step
import com.aliucord.manager.patcher.steps.download.CopyDependenciesStep
import com.aliucord.manager.patcher.util.ApkAlignment
import dev.raincord.manager.R
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

class AlignmentStep : Step(), KoinComponent {
    private val paths: PathManager by inject()
    override val group = StepGroup.Install
    override val localizedName = R.string.patch_step_alignment

    override suspend fun execute(container: StepRunner) {
        for (apk in container.getStep<CopyDependenciesStep>().patchedApks) {
            ApkAlignment.align(apk, paths.patchingWorkingDir(), container::log)
        }
    }
}

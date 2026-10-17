package com.aliucord.manager.patcher.steps.base

import com.aliucord.manager.patcher.StepRunner
import com.aliucord.manager.manager.download.DownloadIntegrity
import com.aliucord.manager.patcher.steps.prepare.FetchDiscordRNAStep
import kotlin.properties.Delegates

abstract class DownloadDiscordRNAStep : DownloadStep() {
    override suspend fun verify() {
        super.verify()
        DownloadIntegrity.checkApk(targetFile)
    }
    protected var version by Delegates.notNull<Int>()
        private set

    override suspend fun execute(container: StepRunner) {
        version = container.getStep<FetchDiscordRNAStep>().targetVersion
        super.execute(container)
    }
}

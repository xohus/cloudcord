package dev.beefers.vendetta.manager.installer.step.patching

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.Rect
import java.io.ByteArrayOutputStream
import androidx.compose.ui.graphics.Color
import com.github.diamondminer88.zip.ZipWriter
import com.github.diamondminer88.zip.ZipReader
import dev.beefers.vendetta.manager.R
import dev.beefers.vendetta.manager.domain.manager.PreferenceManager
import dev.beefers.vendetta.manager.installer.step.Step
import dev.beefers.vendetta.manager.installer.step.StepGroup
import dev.beefers.vendetta.manager.installer.step.StepRunner
import dev.beefers.vendetta.manager.installer.util.ArscUtil
import dev.beefers.vendetta.manager.installer.util.ArscUtil.addColorResource
import dev.beefers.vendetta.manager.installer.util.ArscUtil.addResource
import com.google.devrel.gmscore.tools.apk.arsc.BinaryResourceValue
import dev.beefers.vendetta.manager.installer.util.ArscUtil.getMainArscChunk
import dev.beefers.vendetta.manager.installer.util.ArscUtil.getPackageChunk
import dev.beefers.vendetta.manager.installer.util.ArscUtil.getResourceFileName
import dev.beefers.vendetta.manager.installer.util.AxmlUtil
import dev.beefers.vendetta.manager.utils.DiscordVersion
import org.koin.core.component.inject

/**
 * Replaces Discord's adaptive foreground and themed icon with the CloudCord mark.
 */
class ReplaceIconStep : Step() {

    private val preferences: PreferenceManager by inject()

    val context: Context by inject()

    override val group = StepGroup.PATCHING
    override val nameRes = R.string.step_change_icon

    override suspend fun run(runner: StepRunner) {
        val baseApk = runner.discordApks.firstOrNull()
            ?: throw IllegalStateException("No Discord base APK is available for icon patching")

        runner.logger.i("Reading resources.arsc")
        val arsc = ArscUtil.readArsc(baseApk)
        
        val iconRscIds = AxmlUtil.readManifestIconInfo(baseApk)
        val squareIconFile = arsc.getMainArscChunk().getResourceFileName(iconRscIds.squareIcon, "anydpi-v26")
        val roundIconFile = arsc.getMainArscChunk().getResourceFileName(iconRscIds.roundIcon, "anydpi-v26")

        runner.logger.i("Patching icon assets (squareIcon=$squareIconFile, roundIcon=$roundIconFile)")

        val backgroundColor = arsc.getPackageChunk().addColorResource("cloudcord_color", Color(0xFF000000))
        val markPath = "res/drawable/cloudcord_launcher_mark.png"
        val foregroundIcon = arsc.getPackageChunk().addResource(
            typeName = "drawable",
            resourceName = "cloudcord_launcher_mark",
            configurations = { true },
            valueType = BinaryResourceValue.Type.STRING,
            valueData = arsc.getMainArscChunk().stringPool.addString(markPath, true),
        )
        // White alpha-mask on transparent canvas, padded for adaptive-icon masks.
        val source = BitmapFactory.decodeResource(context.resources, R.drawable.cloudcord_mark_source)
            ?: error("CloudCord logo resource could not be decoded")
        val mark = Bitmap.createBitmap(432, 432, Bitmap.Config.ARGB_8888)
        val markBytes = try {
            val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply {
                colorFilter = PorterDuffColorFilter(android.graphics.Color.WHITE, PorterDuff.Mode.SRC_IN)
            }
            Canvas(mark).drawBitmap(source, null, Rect(72, 72, 360, 360), paint)
            ByteArrayOutputStream().use { output ->
                check(mark.compress(Bitmap.CompressFormat.PNG, 100, output)) { "CloudCord logo encoding failed" }
                output.toByteArray()
            }
        } finally { source.recycle(); mark.recycle() }

        val postfix = when (preferences.channel) {
            DiscordVersion.Type.BETA -> "beta"
            DiscordVersion.Type.ALPHA -> "canary"
            else -> null
        }
        
        for (rscFile in setOf(squareIconFile, roundIconFile)) { // setOf to not possibly patch same file twice
            val preferredReference = if (postfix == null) rscFile else {
                rscFile.replace("_$postfix.xml", ".xml")
            }
            val referencePath = ZipReader(baseApk).use {
                if (it.openEntry(preferredReference) != null) preferredReference else rscFile
            }

            runner.logger.i("Patching adaptive icon ($rscFile <- $referencePath)")

            AxmlUtil.patchAdaptiveIcon(
                apk = baseApk,
                resourcePath = rscFile,
                referencePath = referencePath,
                backgroundColor = backgroundColor,
                foregroundIcon = foregroundIcon,
                monochromeIcon = foregroundIcon,
            )
        }

        runner.logger.i("Writing and compiling resources.arsc")
        ZipWriter(baseApk, /* append = */ true).use {
            it.deleteEntry(markPath)
            it.writeEntry(markPath, markBytes)
            it.deleteEntry("resources.arsc")
            it.writeEntry("resources.arsc", arsc.toByteArray())
        }
    }

}

package dev.beefers.vendetta.manager.ui.widgets

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import dev.beefers.vendetta.manager.R
import dev.beefers.vendetta.manager.utils.DiscordVersion

@Composable
fun AppIcon(
    customIcon: Boolean,
    releaseChannel: DiscordVersion.Type,
    modifier: Modifier = Modifier
) {
    val iconColor = remember(customIcon, releaseChannel) {
        when {
            customIcon -> Color(0xFF000000)
            releaseChannel == DiscordVersion.Type.ALPHA -> Color(0xFFFBB33C)
            else -> Color(0xFF5865F2)
        }
    }

    Image(
        painter = painterResource(id = if (customIcon) R.drawable.cloudcord_mark_source else R.drawable.ic_discord_icon),
        colorFilter = if (customIcon) ColorFilter.tint(Color.White) else null,
        contentDescription = null,
        modifier = modifier
            .clip(CircleShape)
            .background(iconColor)
            .then(if (customIcon) Modifier.padding(10.dp) else Modifier)
    )
}

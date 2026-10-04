Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$taskRepo = Split-Path -Parent $taskRoot
$taskImage = [System.Drawing.Image]::FromFile((Join-Path $taskRepo 'assets/cloudcord-favicon.png'))
try {
    foreach ($taskSize in @(16, 32, 48, 128)) {
        $taskBitmap = [System.Drawing.Bitmap]::new($taskSize, $taskSize)
        $taskGraphics = [System.Drawing.Graphics]::FromImage($taskBitmap)
        try {
            $taskGraphics.Clear([System.Drawing.Color]::Transparent)
            $taskGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $taskScale = ($taskSize * 0.92) / [Math]::Max($taskImage.Width, $taskImage.Height)
            $taskWidth = [single]($taskImage.Width * $taskScale)
            $taskHeight = [single]($taskImage.Height * $taskScale)
            $taskGraphics.DrawImage($taskImage, [single](($taskSize-$taskWidth)/2), [single](($taskSize-$taskHeight)/2), $taskWidth, $taskHeight)
            $taskName = if ($taskSize -eq 128) { 'icon.png' } else { "icon-$taskSize.png" }
            $taskBitmap.Save((Join-Path $taskRoot "client/browser/$taskName"), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $taskGraphics.Dispose(); $taskBitmap.Dispose() }
    }
} finally { $taskImage.Dispose() }

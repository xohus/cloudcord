$link = "https://github.com/xohus/cloudcord/releases/latest/download/cloudcord-cli.exe"

$outfile = "$env:TEMP\cloudcord-cli.exe"

Write-Output "Downloading installer to $outfile"

Invoke-WebRequest -Uri "$link" -OutFile "$outfile"

Write-Output ""

Start-Process -Wait -NoNewWindow -FilePath "$outfile"

# Cleanup
Remove-Item -Force "$outfile"

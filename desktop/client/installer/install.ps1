$link = "https://github.com/cloudcord-mod/cloudcord/releases/latest/download/CloudCordSetupCli.exe"

$outfile = "$env:TEMP\CloudCordSetupCli.exe"

Write-Output "Downloading installer to $outfile"

Invoke-WebRequest -Uri "$link" -OutFile "$outfile"

Write-Output ""

Start-Process -Wait -NoNewWindow -FilePath "$outfile"

# Cleanup
Remove-Item -Force "$outfile"

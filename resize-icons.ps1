Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\User\Documents\where-in-google-map\icon.png"
$destPath = "C:\Users\User\Documents\where-in-google-map\images"

$img = [System.Drawing.Image]::FromFile($sourcePath)

# Create 16x16 icon
$bmp16 = New-Object System.Drawing.Bitmap(16, 16)
$g16 = [System.Drawing.Graphics]::FromImage($bmp16)
$g16.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g16.DrawImage($img, 0, 0, 16, 16)
$bmp16.Save("$destPath\icon16.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g16.Dispose()
$bmp16.Dispose()

# Create 48x48 icon
$bmp48 = New-Object System.Drawing.Bitmap(48, 48)
$g48 = [System.Drawing.Graphics]::FromImage($bmp48)
$g48.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g48.DrawImage($img, 0, 0, 48, 48)
$bmp48.Save("$destPath\icon48.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g48.Dispose()
$bmp48.Dispose()

# Create 128x128 icon
$bmp128 = New-Object System.Drawing.Bitmap(128, 128)
$g128 = [System.Drawing.Graphics]::FromImage($bmp128)
$g128.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g128.DrawImage($img, 0, 0, 128, 128)
$bmp128.Save("$destPath\icon128.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g128.Dispose()
$bmp128.Dispose()

$img.Dispose()

Write-Host "Icons created successfully!"

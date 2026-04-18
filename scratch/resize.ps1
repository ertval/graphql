Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("e:\Ertval One\_Software\zone-modules\Modules\graphql\favicon.png")
$bmp = New-Object System.Drawing.Bitmap(64,64)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 64, 64)
$bmp.Save("e:\Ertval One\_Software\zone-modules\Modules\graphql\favicon_64.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$img.Dispose()

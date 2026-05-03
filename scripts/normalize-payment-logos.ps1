Add-Type -AssemblyName System.Drawing

function Save-NormalizedLogo {
  param(
    [string]$SourcePath,
    [string]$OutputPath,
    [int]$TargetHeight = 28,
    [int]$PaddingX = 12,
    [int]$PaddingY = 6,
    [int]$AlphaThreshold = 32
  )

  $src = New-Object System.Drawing.Bitmap($SourcePath)
  $minX = $src.Width
  $minY = $src.Height
  $maxX = -1
  $maxY = -1

  for ($y = 0; $y -lt $src.Height; $y++) {
    for ($x = 0; $x -lt $src.Width; $x++) {
      $pixel = $src.GetPixel($x, $y)
      if ($pixel.A -ge $AlphaThreshold) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt 0) {
    $src.Dispose()
    throw "No visible pixels found in $SourcePath"
  }

  $cropWidth = $maxX - $minX + 1
  $cropHeight = $maxY - $minY + 1
  $scale = $TargetHeight / [double]$cropHeight
  $drawWidth = [Math]::Max(1, [int][Math]::Round($cropWidth * $scale))
  $canvasWidth = $drawWidth + ($PaddingX * 2)
  $canvasHeight = $TargetHeight + ($PaddingY * 2)

  $dest = New-Object System.Drawing.Bitmap($canvasWidth, $canvasHeight)
  $graphics = [System.Drawing.Graphics]::FromImage($dest)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $cropWidth, $cropHeight)
  $destRect = New-Object System.Drawing.Rectangle($PaddingX, $PaddingY, $drawWidth, $TargetHeight)
  $graphics.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $dest.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $graphics.Dispose()
  $dest.Dispose()
  $src.Dispose()

  Write-Output ("Saved " + $OutputPath + " (" + $canvasWidth + "x" + $canvasHeight + ")")
}

Save-NormalizedLogo -SourcePath "c:\Users\UsEr\Pictures\Screenshots\payment-bri.png" -OutputPath "c:\Users\UsEr\redfeng-frontend\public\home-assets\payment-bri.png"
Save-NormalizedLogo -SourcePath "c:\Users\UsEr\Pictures\Screenshots\payment-mandiri.png" -OutputPath "c:\Users\UsEr\redfeng-frontend\public\home-assets\payment-mandiri.png"

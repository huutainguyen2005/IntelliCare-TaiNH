#!/usr/bin/env pwsh
# =============================================================================
# IntelliCare Workshop - Test Script (tuong thich PowerShell 5+)
# Test full flow: Register -> Start Weighing -> Submit Mock Data -> Verify DB
#
# Cach dung:
#   .\test_api.ps1                     # Test tren LOCAL (localhost:8081)
#   .\test_api.ps1 -Target render      # Test tren Render
#   .\test_api.ps1 -Target render -Email "ban@gmail.com"
# =============================================================================
param(
    [ValidateSet("local", "render")]
    [string]$Target = "local",

    [string]$Email       = "test.intellicare@gmail.com",
    [string]$FullName    = "Nguyen Van Test",
    [string]$DeviceId    = "WORKSHOP_SCALE_01",
    [double]$MockWeightKg = 65.5,
    [double]$HeightCm    = 170.0
)

# ── Cau hinh ──────────────────────────────────────────────────────────────────
$BASE_URL = if ($Target -eq "render") {
    "https://intellicare-tainh-1.onrender.com"
} else {
    "http://localhost:8081"
}

$DEVICE_API_KEY = "J9cBoTajOm2GSu-53EyPLKzZRMsyWnYTgsM3bMP0mD4"

# ── Helper: in mau ────────────────────────────────────────────────────────────
function Write-Title($text) {
    Write-Host ""
    Write-Host ("=" * 62) -ForegroundColor DarkCyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ("=" * 62) -ForegroundColor DarkCyan
}

function Write-Step($step, $text) {
    Write-Host "`n[Buoc $step] $text" -ForegroundColor Yellow
}

function Write-Ok($text)   { Write-Host "  [OK ] $text" -ForegroundColor Green }
function Write-Err($text)  { Write-Host "  [LOI] $text" -ForegroundColor Red }
function Write-Info($text) { Write-Host "       $text"  -ForegroundColor Gray }

# ── Helper: goi API ────────────────────────────────────────────────────────────
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers,
        [string]$Body = $null
    )

    try {
        $params = @{
            Method             = $Method
            Uri                = $Url
            Headers            = $Headers
            UseBasicParsing    = $true
        }
        if ($Body) {
            $params.Body = $Body
        }

        $raw      = Invoke-WebRequest @params
        $parsed   = $raw.Content | ConvertFrom-Json
        return [pscustomobject]@{
            Success    = $true
            StatusCode = [int]$raw.StatusCode
            Data       = $parsed
        }
    }
    catch {
        $statusCode = 0
        $errMsg     = $_.Exception.Message
        $errBody    = $null

        try {
            $resp = $_.Exception.Response
            if ($resp -ne $null) {
                $statusCode = [int]$resp.StatusCode
                $stream     = $resp.GetResponseStream()
                $reader     = New-Object System.IO.StreamReader($stream)
                $raw        = $reader.ReadToEnd()
                $errBody    = $raw | ConvertFrom-Json
                if ($errBody.message) { $errMsg = $errBody.message }
            }
        } catch { }

        return [pscustomobject]@{
            Success    = $false
            StatusCode = $statusCode
            Error      = $errMsg
        }
    }
}

# =============================================================================
# BAT DAU TEST
# =============================================================================
Write-Title "IntelliCare Workshop - API Test Script"
Write-Info "Target    : $BASE_URL  ($Target)"
Write-Info "Email     : $Email"
Write-Info "Ho ten    : $FullName"
Write-Info "DeviceId  : $DeviceId"
Write-Info "Weight    : ${MockWeightKg} kg   Height: ${HeightCm} cm"

$heightM     = $HeightCm / 100.0
$expectedBmi = [Math]::Round($MockWeightKg / ($heightM * $heightM), 1)
Write-Info "BMI du kien: $expectedBmi"

# ── STEP 0: Ping server ────────────────────────────────────────────────────────
Write-Step 0 "Ping server..."

$ping = Invoke-Api -Method GET -Url "$BASE_URL/api/workshop/sessions/0" -Headers @{ "Accept" = "application/json" }
# sessions/0 luon tra 400 "Khong tim thay" - nghia la server dang song
if ($ping.StatusCode -ge 200 -and $ping.StatusCode -lt 600) {
    Write-Ok "Server dang chay tai $BASE_URL (HTTP $($ping.StatusCode))"
} else {
    Write-Err "Khong ket noi duoc: $($ping.Error)"
    if ($Target -eq "local") {
        Write-Host ""
        Write-Host "  Goi y: Chay backend truoc bang lenh sau:" -ForegroundColor Magenta
        Write-Host "    cd d:\EXE\IntelliCare-TaiNH\intellicare-workshop-backend" -ForegroundColor Magenta
        Write-Host "    .\mvnw.cmd spring-boot:run" -ForegroundColor Magenta
    }
    exit 1
}

# ── STEP 1: Dang ky participant ────────────────────────────────────────────────
Write-Step 1 "Dang ky participant  ->  POST /api/workshop/register"

$registerBody = '{"fullName":"' + $FullName + '","email":"' + $Email + '","deviceId":"' + $DeviceId + '"}'
Write-Info "Body: $registerBody"

$reg = Invoke-Api -Method POST `
    -Url "$BASE_URL/api/workshop/register" `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $registerBody

if (-not $reg.Success) {
    Write-Err "Dang ky that bai (HTTP $($reg.StatusCode)): $($reg.Error)"
    exit 1
}

$sessionId = $reg.Data.sessionId
Write-Ok "Dang ky thanh cong!"
Write-Info "Session ID  : $sessionId"
Write-Info "Status      : $($reg.Data.status)"
Write-Info "Participant : $($reg.Data.fullName)  <$($reg.Data.email)>"

# ── STEP 2: Bat dau can ────────────────────────────────────────────────────────
Write-Step 2 "Bat dau can  ->  POST /api/workshop/sessions/$sessionId/start-weighing"

$sw = Invoke-Api -Method POST `
    -Url "$BASE_URL/api/workshop/sessions/$sessionId/start-weighing" `
    -Headers @{ "Content-Type" = "application/json" }

if (-not $sw.Success) {
    Write-Err "Start-weighing that bai (HTTP $($sw.StatusCode)): $($sw.Error)"
    exit 1
}

Write-Ok "Phien do chuyen sang trang thai: $($sw.Data.status)"

# ── STEP 3: Submit mock data ────────────────────────────────────────────────────
Write-Step 3 "Submit mock data  ->  POST /api/workshop/measurements/submit"

$submitBody = '{"deviceId":"' + $DeviceId + '","rawHex":"MOCK","mockWeightKg":' + $MockWeightKg + ',"heightCm":' + $HeightCm + '}'
Write-Info "Body  : $submitBody"
Write-Info "Header: X-Device-Key = $($DEVICE_API_KEY.Substring(0,12))..."

$sub = Invoke-Api -Method POST `
    -Url "$BASE_URL/api/workshop/measurements/submit" `
    -Headers @{
        "Content-Type" = "application/json"
        "X-Device-Key" = $DEVICE_API_KEY
    } `
    -Body $submitBody

if (-not $sub.Success) {
    Write-Err "Submit that bai (HTTP $($sub.StatusCode)): $($sub.Error)"
    if ($sub.StatusCode -eq 401) {
        Write-Err ">> X-Device-Key sai hoac server dung key khac!"
    }
    if ($sub.StatusCode -eq 400) {
        Write-Err ">> Co the MOCK_BYPASS_ENABLED chua duoc bat tren server."
        Write-Err "   Them MOCK_BYPASS_ENABLED=true vao bien moi truong Render."
    }
    exit 1
}

Write-Ok "Submit thanh cong! Response: $($sub.Data.message)"

# ── STEP 4: Kiem tra DB ────────────────────────────────────────────────────────
Write-Step 4 "Kiem tra ket qua trong DB  ->  GET /api/workshop/sessions/$sessionId"

Start-Sleep -Milliseconds 800

$check = Invoke-Api -Method GET `
    -Url "$BASE_URL/api/workshop/sessions/$sessionId" `
    -Headers @{ "Accept" = "application/json" }

if (-not $check.Success) {
    Write-Err "Lay trang thai that bai (HTTP $($check.StatusCode)): $($check.Error)"
    exit 1
}

$s = $check.Data
Write-Ok "Session trong DB:"
Write-Info "  status       = $($s.status)"
Write-Info "  weightKg     = $($s.weightKg)"
Write-Info "  heightCm     = $($s.heightCm)"
Write-Info "  bmi          = $($s.bmi)  (du kien: $expectedBmi)"
Write-Info "  emailSent    = $($s.emailSent)"
Write-Info "  completedAt  = $($s.completedAt)"

# ── ASSERTIONS ────────────────────────────────────────────────────────────────
Write-Title "KET QUA ASSERTIONS"

$allPassed = $true

function Assert-Equal($actual, $expected, $label) {
    if ("$actual" -eq "$expected") {
        Write-Ok "PASS  $label  ($actual)"
    } else {
        Write-Err "FAIL  $label  (actual=$actual  expected=$expected)"
        $script:allPassed = $false
    }
}

Assert-Equal $s.status      "Completed"     "Status = Completed"
Assert-Equal $s.weightKg    $MockWeightKg   "weightKg = $MockWeightKg"
Assert-Equal $s.heightCm    $HeightCm       "heightCm = $HeightCm"
Assert-Equal $s.bmi         $expectedBmi    "BMI = $expectedBmi"
Assert-Equal $s.emailSent   "True"          "Email da duoc gui"

Write-Host ""
if ($allPassed) {
    Write-Host "  [PASS] FULL FLOW OK! Kiem tra hop thu: $Email" `
        -ForegroundColor Black -BackgroundColor Green
} else {
    Write-Host "  [FAIL] CO BUOC THAT BAI - xem log o tren de debug" `
        -ForegroundColor White -BackgroundColor DarkRed
    exit 1
}

Write-Host ""

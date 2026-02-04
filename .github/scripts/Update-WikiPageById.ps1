# Update-WikiPageById.ps1
# Updates an Azure DevOps wiki page using the PATCH endpoint with page ID
# This prevents duplicate page creation that occurs with path-based updates

param(
    [Parameter(Mandatory=$true)]
    [int]$PageId,
    
    [Parameter(Mandatory=$true)]
    [string]$Content,
    
    [Parameter(Mandatory=$false)]
    [string]$WikiName = "Digital Platforms Wiki",
    
    [Parameter(Mandatory=$false)]
    [string]$Project = "Digital Platforms",
    
    [Parameter(Mandatory=$false)]
    [string]$Organization = "https://dev.azure.com/UMGC",
    
    [Parameter(Mandatory=$false)]
    [string]$Comment = "Updated via PowerShell script"
)

$ErrorActionPreference = "Stop"

# Add System.Web assembly for URL encoding
Add-Type -AssemblyName System.Web

# Colors for output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Failure { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

# Check if Azure CLI is installed
Write-Info "Checking Azure CLI installation..."
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Success "Azure CLI version: $($azVersion.'azure-cli')"
} catch {
    Write-Failure "Azure CLI is not installed. Please install from https://aka.ms/azure-cli"
    exit 1
}

# Check if logged in to Azure DevOps
Write-Info "Checking Azure DevOps authentication..."
try {
    az devops project list --organization $Organization --output none 2>$null
    Write-Success "Already authenticated with Azure DevOps"
} catch {
    Write-Info "Not logged in. Launching Azure DevOps login..."
    az devops login --organization $Organization
    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Failed to login to Azure DevOps"
        exit 1
    }
}

# Get access token from Azure CLI
Write-Info "Getting access token from Azure CLI..."
$token = az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv

if (-not $token) {
    Write-Failure "Failed to get access token from Azure CLI"
    exit 1
}

Write-Success "Access token retrieved"

# Prepare headers
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

# URL encode project name (replace space with %20, not +)
$projectEncoded = $Project.Replace(' ', '%20')
# Wiki name is usually a GUID, so no encoding needed
$wikiNameEncoded = $WikiName

# Step 1: Get current page to retrieve ETag
Write-Info "Fetching current page (ID: $PageId)..."
$getUri = "$Organization/$projectEncoded/_apis/wiki/wikis/$wikiNameEncoded/pages/$PageId`?api-version=7.1"

try {
    # Use Invoke-WebRequest to get headers (ETag is in header, not body)
    $response = Invoke-WebRequest -Uri $getUri -Method Get -Headers $headers
    $currentPage = $response.Content | ConvertFrom-Json
    $etag = $response.Headers['ETag'][0]  # ETag is in response header
    
    Write-Success "Retrieved page: $($currentPage.path)"
    Write-Info "   Current ETag: $etag"
} catch {
    Write-Failure "Failed to get current page: $($_.Exception.Message)"
    exit 1
}

# Step 2: Update page using PATCH with ID (prevents duplicates!)
Write-Info "Updating page using PATCH endpoint with ID..."
$patchUri = "$Organization/$projectEncoded/_apis/wiki/wikis/$wikiNameEncoded/pages/$PageId`?api-version=7.1"

# Add If-Match header for concurrency control
$headers["If-Match"] = $etag

# Add comment if provided
if ($Comment) {
    $patchUri += "&comment=$([System.Web.HttpUtility]::UrlEncode($Comment))"
}

$body = @{
    content = $Content
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $patchUri -Method Patch -Headers $headers -Body $body
    
    # Step 3: Verify the update (critical check!)
    if ($response.id -eq $PageId) {
        Write-Success "Page updated successfully!"
        Write-Host ""
        Write-Host "📄 Page Details:" -ForegroundColor Yellow
        Write-Host "   ID:      $($response.id)"
        Write-Host "   Path:    $($response.path)"
        Write-Host "   Order:   $($response.order)"
        Write-Host "   URL:     $($response.remoteUrl)"
        Write-Host ""
        Write-Success "No duplicate page created - ID matches!"
        
        return $response
    } else {
        Write-Failure "Response ID ($($response.id)) doesn't match requested ID ($PageId)"
        Write-Failure "A duplicate page may have been created!"
        exit 1
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message
    
    Write-Failure "Failed to update page"
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    Write-Host "Error: $errorBody" -ForegroundColor Red
    
    if ($statusCode -eq 412) {
        Write-Host ""
        Write-Host "⚠️  Concurrency conflict (412 Precondition Failed)" -ForegroundColor Yellow
        Write-Host "   The page was modified by someone else since we retrieved it."
        Write-Host "   Please try again to get the latest version."
    }
    
    exit 1
}

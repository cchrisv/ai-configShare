#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Uploads markdown files to Azure DevOps Wiki.

.DESCRIPTION
    This script uploads all markdown files from a specified directory to Azure DevOps Wiki at the root level.

.PARAMETER WikiPagesPath
    Path to the directory containing markdown files to upload.

.PARAMETER WikiId
    The GUID of the Azure DevOps wiki.

.PARAMETER Project
    The Azure DevOps project name.

.PARAMETER Organization
    The Azure DevOps organization URL.

.EXAMPLE
    .\Upload-WikiPages.ps1 -WikiPagesPath ".\wiki-pages" -WikiId "c7b64b09-35f3-4d8a-889c-5650655281ee" -Project "Digital Platforms"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$WikiPagesPath,
    
    [Parameter(Mandatory=$false)]
    [string]$WikiId = "c7b64b09-35f3-4d8a-889c-5650655281ee",
    
    [Parameter(Mandatory=$false)]
    [string]$Project = "Digital Platforms",
    
    [Parameter(Mandatory=$false)]
    [string]$Organization = "https://dev.azure.com/UMGC"
)

# Get Azure DevOps token from az CLI
$token = az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv

if ([string]::IsNullOrEmpty($token)) {
    Write-Host "ERROR: Unable to get Azure DevOps access token. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

# Get all markdown files
$markdownFiles = Get-ChildItem -Path $WikiPagesPath -Filter "*.md" | Sort-Object Name

if ($markdownFiles.Count -eq 0) {
    Write-Host "No markdown files found in $WikiPagesPath" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($markdownFiles.Count) markdown files to upload" -ForegroundColor Green

foreach ($file in $markdownFiles) {
    Write-Host "`nProcessing: $($file.Name)" -ForegroundColor Cyan
    
    # Read file content
    $content = Get-Content -Path $file.FullName -Raw
    
    # Create page path (remove .md extension and encode)
    $pageName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $pagePath = "/$pageName"
    
    Write-Host "  Uploading to path: $pagePath" -ForegroundColor Gray
    
    # Try to create the page
    $uri = "$Organization/$Project/_apis/wiki/wikis/$WikiId/pages?path=$([System.Uri]::EscapeDataString($pagePath))&api-version=7.1"
    
    $body = @{
        content = $content
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body $body
        
        Write-Host "  ✅ Successfully uploaded: $pageName" -ForegroundColor Green
        Write-Host "     Page ID: $($response.id)" -ForegroundColor Gray
        Write-Host "     URL: $($response.remoteUrl)" -ForegroundColor Gray
    }
    catch {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorDetails) {
            Write-Host "  ❌ Failed to upload $pageName" -ForegroundColor Red
            Write-Host "     Error: $($errorDetails.message)" -ForegroundColor Red
        } else {
            Write-Host "  ❌ Failed to upload $pageName" -ForegroundColor Red
            Write-Host "     Error: $_" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ Upload complete!" -ForegroundColor Green
Write-Host "Processed $($markdownFiles.Count) files" -ForegroundColor Yellow

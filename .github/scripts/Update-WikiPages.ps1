#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Updates existing Azure DevOps Wiki pages with new content.

.DESCRIPTION
    This script updates existing wiki pages using their page IDs and the PATCH endpoint.

.PARAMETER WikiPagesPath
    Path to the directory containing markdown files to upload.

.PARAMETER WikiId
    The GUID of the Azure DevOps wiki.

.PARAMETER Project
    The Azure DevOps project name.

.PARAMETER Organization
    The Azure DevOps organization URL.

.EXAMPLE
    .\Update-WikiPages.ps1 -WikiPagesPath ".\wiki-pages"
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

# Mapping of file names to page IDs from the previous upload
$pageMapping = @{
    "Admit Term Data Definition" = 9797
    "Journey Pipeline Optimization - Disc. Session 1" = 9799
    "Journey Pipeline Optimization - Disc. Session 2" = 9801
    "Journey Pipeline Optimization - Disc. Session 3" = 9803
    "Journey Pipeline Optimization - Disc. Session 4" = 9805
    "Journey Pipeline Optimization - Disc. Session 5" = 9807
    "Program Status Data " = 9809
    "Re-admit Population Follow up " = 9810
}

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

Write-Host "Found $($markdownFiles.Count) markdown files to update" -ForegroundColor Green

foreach ($file in $markdownFiles) {
    $pageName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    
    # Check if this page has a mapping
    if (-not $pageMapping.ContainsKey($pageName)) {
        Write-Host "`n⚠️  Skipping $pageName - no page ID mapping found" -ForegroundColor Yellow
        continue
    }
    
    $pageId = $pageMapping[$pageName]
    Write-Host "`nProcessing: $($file.Name)" -ForegroundColor Cyan
    Write-Host "  Page ID: $pageId" -ForegroundColor Gray
    
    # Read file content
    $content = Get-Content -Path $file.FullName -Raw
    
    # Get current page to retrieve ETag
    $getUri = "$Organization/$Project/_apis/wiki/wikis/$WikiId/pages/$($pageId)?api-version=7.1"
    
    try {
        $currentPage = Invoke-WebRequest -Uri $getUri -Method Get -Headers $headers
        $etag = $currentPage.Headers['ETag'][0]
        
        Write-Host "  Current ETag: $etag" -ForegroundColor Gray
        
        # Update the page using PATCH
        $patchUri = "$Organization/$Project/_apis/wiki/wikis/$WikiId/pages/$($pageId)?api-version=7.1"
        
        $patchHeaders = $headers.Clone()
        $patchHeaders['If-Match'] = $etag
        
        $body = @{
            content = $content
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri $patchUri -Method Patch -Headers $patchHeaders -Body $body
        
        Write-Host "  ✅ Successfully updated: $pageName" -ForegroundColor Green
        Write-Host "     New version: $($response.gitItemPath)" -ForegroundColor Gray
    }
    catch {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorDetails) {
            Write-Host "  ❌ Failed to update $pageName" -ForegroundColor Red
            Write-Host "     Error: $($errorDetails.message)" -ForegroundColor Red
        } else {
            Write-Host "  ❌ Failed to update $pageName" -ForegroundColor Red
            Write-Host "     Error: $_" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ Update complete!" -ForegroundColor Green

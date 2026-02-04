#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Converts Word documents to Azure DevOps Wiki formatted markdown pages.

.DESCRIPTION
    This script converts Word (.docx) documents to properly formatted Azure DevOps Wiki pages
    with correct H1 structure, TOC placement, Mermaid diagrams, and proper formatting.

.PARAMETER WordDocsPath
    Path to the directory containing Word documents.

.PARAMETER OutputPath
    Path where the converted wiki markdown files will be saved.

.EXAMPLE
    .\Convert-WordDocsToWiki.ps1 -WordDocsPath ".\transcripts" -OutputPath ".\wiki-pages"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$WordDocsPath,
    
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

function Convert-WordToMarkdown {
    param(
        [string]$WordFilePath
    )
    
    try {
        # Create Word application object
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        
        # Open document
        $doc = $word.Documents.Open($WordFilePath)
        
        # Extract text content
        $content = $doc.Content.Text
        
        # Close document and quit Word
        $doc.Close([ref]$false)
        $word.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
        
        return $content
    }
    catch {
        Write-Host "Error reading Word document: $_" -ForegroundColor Red
        return $null
    }
}

function Convert-WordDocToWiki {
    param(
        [string]$FilePath,
        [string]$OutputDirectory
    )
    
    Write-Host "Processing: $FilePath" -ForegroundColor Green
    
    $filename = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    
    # Extract content from Word document
    $content = Convert-WordToMarkdown -WordFilePath $FilePath
    
    if ($null -eq $content) {
        Write-Host "Skipping $filename - unable to read content" -ForegroundColor Yellow
        return
    }
    
    # Clean up content
    $content = $content -replace '\r\n', "`n"
    $content = $content -replace '\r', "`n"
    $content = $content.Trim()
    
    # Format transcript-style content for better readability
    $formattedContent = $content -split "`n" | ForEach-Object {
        # Match pattern: Name   Timestamp:Text
        if ($_ -match '^([A-Za-z\s]+?)\s+(\d{1,2}:\d{2}(?::\d{2})?)(.*?)$') {
            $speaker = $matches[1].Trim()
            $timestamp = $matches[2]
            $message = $matches[3].Trim()
            
            if ($message) {
                "**[$timestamp] $speaker**  `n$message`n"
            }
        } 
        # Match standalone timestamp lines
        elseif ($_ -match '^\d{1,2}:\d{2}') {
            "$_`n"
        }
        # Keep other content as-is
        elseif ($_.Trim()) {
            "$_`n"
        }
    }
    $content = $formattedContent -join ""
    
    # Determine document type and structure
    $title = $filename
    
    # Generate wiki content
    $wikiContent = @"
# $title

## Overview

This document contains information related to the Journey Pipeline Optimization project.

[[_TOC_]]

## Document Information

**Source:** $filename.docx  
**Converted:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  

## Content

$content

## Process Flow

::: mermaid
graph TD
    A[Data Collection] --> B[Analysis]
    B --> C[Implementation]
    C --> D[Validation]
    D --> E[Documentation]
    
    classDef start fill:#3F51B5,color:#fff
    classDef process fill:#0f6cbd,color:#fff
    classDef action fill:#4CAF50,color:#fff
    classDef end fill:#757575,color:#fff
    
    class A start
    class B,C process
    class D action
    class E end
:::
> *Diagram: General workflow for data and process implementation.*

---

*This document is part of the Journey Pipeline Optimization project documentation. For questions or updates, please contact the project team.*
"@
    
    # Clean up any extra whitespace
    $wikiContent = $wikiContent -replace '\n{3,}', "`n`n"
    
    # Create output file
    $outputFile = Join-Path $OutputDirectory "$title.md"
    $wikiContent | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host "Created: $outputFile" -ForegroundColor Cyan
}

# Check if Word is installed
try {
    $word = New-Object -ComObject Word.Application
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
catch {
    Write-Host "ERROR: Microsoft Word is not installed or not accessible." -ForegroundColor Red
    Write-Host "This script requires Microsoft Word to convert .docx files." -ForegroundColor Red
    exit 1
}

# Process all Word documents
$wordFiles = Get-ChildItem -Path $WordDocsPath -Filter "*.docx" | 
    Where-Object { $_.Name -notlike "~*" } | # Exclude temporary Word files
    Sort-Object Name

if ($wordFiles.Count -eq 0) {
    Write-Host "No Word documents found in $WordDocsPath" -ForegroundColor Yellow
    exit 0
}

foreach ($file in $wordFiles) {
    Convert-WordDocToWiki -FilePath $file.FullName -OutputDirectory $OutputPath
}

Write-Host "`nConversion complete! Processed $($wordFiles.Count) files." -ForegroundColor Green
Write-Host "Output directory: $OutputPath" -ForegroundColor Yellow

#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Converts transcript files to Azure DevOps Wiki formatted markdown pages.

.DESCRIPTION
    This script converts transcript text files to properly formatted Azure DevOps Wiki pages
    with correct H1 structure, TOC placement, Mermaid diagrams, and proper formatting.

.PARAMETER TranscriptsPath
    Path to the directory containing transcript files.

.PARAMETER OutputPath
    Path where the converted wiki markdown files will be saved.

.EXAMPLE
    .\Convert-TranscriptsToWiki.ps1 -TranscriptsPath ".\transcripts" -OutputPath ".\wiki-pages"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$TranscriptsPath,
    
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

function Convert-TranscriptToWiki {
    param(
        [string]$FilePath,
        [string]$OutputDirectory
    )
    
    Write-Host "Processing: $FilePath" -ForegroundColor Green
    
    $content = Get-Content -Path $FilePath -Raw
    $filename = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    
    # Extract metadata
    $title = $filename -replace '\s*\(\d+\)$', ''  # Remove trailing (1), (2) etc.
    $meetingDate = "Unknown"
    $duration = "Unknown"
    $participants = "Unknown"
    
    # Extract meeting metadata
    if ($content -match 'Meeting started: (.+)') {
        $meetingDate = $matches[1].Trim()
    }
    if ($content -match 'Duration: (.+)') {
        $duration = $matches[1].Trim()
    }
    if ($content -match 'Participants: (.+)') {
        $participants = $matches[1].Trim()
    }
    
    # Extract highlights section
    $highlights = ""
    # More flexible pattern to handle various line endings and spacing
    if ($content -match '## Highlights\s*\r?\n\s*\r?\n(.*?)\s*\r?\n\s*\r?\n## Transcript') {
        $highlights = $matches[1].Trim()
    } else {
        # Fallback: extract lines between Highlights and Transcript
        $lines = $content -split "`r?`n"
        $inHighlights = $false
        $highlightLines = @()
        
        foreach ($line in $lines) {
            if ($line -match '^## Highlights$') {
                $inHighlights = $true
                continue
            }
            if ($line -match '^## Transcript$') {
                break
            }
            if ($inHighlights -and $line.Trim() -ne "") {
                $highlightLines += $line
            }
        }
        $highlights = $highlightLines -join "`r`n"
    }
    
    # Extract transcript content
    $transcriptContent = ""
    # Use single-line mode to make dot match newlines, or use fallback method
    if ($content -match '(?s)## Transcript\s*\r?\n\s*\r?\n(.*)') {
        $transcriptContent = $matches[1].Trim()
    } elseif ($content -match '(?s)## Transcript\s*\r?\n(.*)') {
        $transcriptContent = $matches[1].Trim()
    } else {
        # Fallback: find everything after "## Transcript" line, including lines with leading spaces
        $lines = $content -split "`r?`n"
        $transcriptStarted = $false
        $transcriptLines = @()
        
        foreach ($line in $lines) {
            if ($line.Trim() -match '^## Transcript$') {
                $transcriptStarted = $true
                continue
            }
            if ($transcriptStarted) {
                $transcriptLines += $line
            }
        }
        $transcriptContent = $transcriptLines -join "`r`n"
    }
    
    # Format transcript for better readability
    $formattedTranscript = $transcriptContent -split "`r?`n" | ForEach-Object {
        if ($_ -match '^(\d{1,2}:\d{2}(?::\d{2})?)\s+([^:]+):\s*(.*)$') {
            $timestamp = $matches[1]
            $speaker = $matches[2].Trim()
            $message = $matches[3].Trim()
            
            if ($message) {
                "**[$timestamp] $speaker**  `n$message`n"
            }
        } elseif ($_.Trim()) {
            "$_`n"
        }
    }
    $transcriptContent = $formattedTranscript -join ""
    
    # Generate wiki content
    $wikiContent = @"
# $title

## Meeting Information

**Date:** $meetingDate  
**Duration:** $duration  
**Participants:** $participants  

## Overview

This document contains the transcript and key highlights from the discovery session focused on Journey Pipeline Optimization. The session covers discussions about current system challenges, proposed improvements, and strategic decisions for enhancing the journey pipeline functionality.

[[_TOC_]]

## Key Highlights

$highlights

## Session Flow

::: mermaid
graph TD
    A[Session Start] --> B[Introductions]
    B --> C[Current State Review]
    C --> D[Problem Identification]
    D --> E[Solution Discussion]
    E --> F[Decision Points]
    F --> G[Action Items]
    G --> H[Session End]
    
    classDef start fill:#3F51B5,color:#fff
    classDef process fill:#0f6cbd,color:#fff
    classDef decision fill:#FF9800,color:#fff
    classDef action fill:#4CAF50,color:#fff
    classDef end fill:#757575,color:#fff
    
    class A start
    class B,C,D,E process
    class F decision
    class G action
    class H end
:::
> *Diagram: Typical flow of a discovery session from introduction through action items.*

## Discussion Topics

### Current Challenges
- Data accuracy issues in journey pipeline stages
- Integration problems with external systems
- Communication strategy limitations
- Process optimization opportunities

### Strategic Decisions
- System architecture improvements
- Data flow enhancements
- User experience optimizations
- Technical debt reduction

## Full Transcript

$transcriptContent

---

*This document is part of the Journey Pipeline Optimization project documentation. For questions or updates, please contact the project team.*
"@
    
    # Clean up any remaining artifacts
    $wikiContent = $wikiContent -replace '\[View original transcript\].*?\n', ''
    $wikiContent = $wikiContent -replace '^\s*\n', ''
    $wikiContent = $wikiContent -replace '\n{3,}', "`n`n"
    
    # Create output file
    $outputFile = Join-Path $OutputDirectory "$title.md"
    $wikiContent | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host "Created: $outputFile" -ForegroundColor Cyan
}

# Process all transcript files
$transcriptFiles = Get-ChildItem -Path $TranscriptsPath -Filter "*.txt" | Sort-Object Name

foreach ($file in $transcriptFiles) {
    Convert-TranscriptToWiki -FilePath $file.FullName -OutputDirectory $OutputPath
}

Write-Host "`nConversion complete! Processed $($transcriptFiles.Count) files." -ForegroundColor Green
Write-Host "Output directory: $OutputPath" -ForegroundColor Yellow

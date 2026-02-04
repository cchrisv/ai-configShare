#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Analyzes transcripts and adds key information sections to wiki pages.
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$WikiPagesPath
)

# Define analysis data for each session based on transcript review
$sessionAnalysis = @{
    "Journey Pipeline Optimization - Disc. Session 1" = @{
        Keywords = @("journey pipeline", "field deprecation", "master student list", "Helio integration", "Salesforce", "deprecated fields", "data accuracy", "marketing cloud", "segmentation", "overseas students", "closed-lost stage", "field optimization", "age calculations", "action process", "readmit identification")
        Topics = @(
            "Journey Pipeline optimization project kickoff and goals"
            "Review of 170+ deprecated fields no longer needed"
            "Master Student List integration with Helio Campus"
            "Field logic and calculation review process"
            "Marketing Cloud segmentation challenges"
            "Overseas student communication exclusions"
            "Data accuracy issues with closed-lost journey stages"
            "Field consolidation and cleanup strategy"
        )
        Decisions = @(
            "Deprecate 170+ unused fields from Journey Pipeline object"
            "Keep number of open phone appointments field for suppression logic"
            "Research readmit identification field for future implementation"
            "Mark recently evaluated field as keep for report jobs"
            "Continue using fields directly from Lead/Contact instead of Journey Pipeline where possible"
            "Schedule follow-up sessions to review remaining fields and process logic"
        )
        Summary = "First discovery session focused on Journey Pipeline optimization, reviewing field usage and identifying 170+ deprecated fields for removal. Team discussed data accuracy challenges, Marketing Cloud segmentation issues, and integration points with Helio Campus. Key themes included streamlining calculations, improving data accuracy for all student populations (including overseas), and ensuring fields serve university-wide needs across dialer, student communications, and admissions."
    }
    
    "Journey Pipeline Optimization - Disc. Session 2" = @{
        Keywords = @("application date", "lead creation", "journey stage evaluation", "date/time fields", "incomplete app status", "lead-to-connect", "app-to-connect", "contact creation", "trigger logic", "incomplete applications", "overlapping communications", "campaign journey triggers", "date field accuracy", "PeopleSoft integration", "stage calculation issues")
        Topics = @(
            "Application date fields and accuracy issues"
            "Lead creation date vs application submission logic"
            "Journey stage evaluation triggers and timing"
            "Incomplete application status determination"
            "Lead-to-Connect and App-to-Connect journey overlap"
            "Campaign communication coordination"
            "Date/time field consolidation needs"
            "PeopleSoft data integration challenges"
        )
        Decisions = @(
            "Consolidate to single accurate datetime field for application submissions"
            "Define clear criteria for 'incomplete application' status"
            "Address overlapping communications between lead and application journeys"
            "Research stage field inaccuracies with specific student examples"
            "Use consultation with Sachin to resolve PeopleSoft integration issues"
            "Focus on root cause analysis for specific stage problems rather than wholesale changes"
        )
        Summary = "Second session deep-dived into application date fields, journey stage triggers, and incomplete application logic. Major discussion around date/time field accuracy, with team identifying need to consolidate multiple date fields into single source of truth. Addressed challenges with overlapping communications between different journey stages and PeopleSoft data integration issues requiring targeted fixes rather than broad systematic changes."
    }
    
    "Journey Pipeline Optimization - Disc. Session 3" = @{
        Keywords = @("applicant journey", "journey stage logic", "exclusions", "SOI students", "career switches", "grad vs undergrad", "Europe/Asia", "military engagement", "lead journeys", "discontinued students", "re-enrollment", "stage evaluation", "closed journeys", "communication targeting")
        Topics = @(
            "Applicant journey stage evaluation logic"
            "Student exclusion criteria (SOI, professional education)"
            "Career-specific journey logic differences"
            "Graduate vs undergraduate journey handling"
            "Europe and Asia campus-specific journeys"
            "Discontinued student re-engagement"
            "Journey closure criteria and impacts"
            "Communication targeting by journey stage"
        )
        Decisions = @(
            "Maintain current exclusion logic for SOI and professional education students"
            "Separate evaluation logic needed for Europe/Asia due to manual drop processes"
            "Expand lead journeys to include overseas site-specific communication"
            "Keep evaluating closed journeys to allow re-engagement opportunities"
            "Regular readmit should trigger return to active journey, not lead world"
            "Applicants should never return to lead status regardless of new lead submissions"
        )
        Summary = "Third session examined applicant journey evaluation logic, focusing on when students should be excluded or closed out of journeys. Team clarified different handling for graduate vs undergraduate, domestic vs international students. Key emphasis on ensuring closed journeys continue evaluation for re-engagement and that applicants maintain applicant status even with new lead submissions. Addressed overseas population communication needs and stage transition logic."
    }
    
    "Journey Pipeline Optimization - Disc. Session 4" = @{
        Keywords = @("lead journey logic", "application discovery", "incomplete apps", "app day zero", "lead status transitions", "latest lead date", "journey stage reset", "app-to-connect process", "duplicate prevention", "trigger optimization", "voicemail automation", "action log creation", "Connect team integration")
        Topics = @(
            "Lead journey evaluation process review"
            "Application discovery and attachment to leads"
            "Incomplete app handling in lead stage"
            "Latest lead creation date impact on journeys"
            "Journey stage reset logic for new leads"
            "App Day Zero trigger automation"
            "Voicemail blast automation with Connect"
            "Action log creation from Salesforce"
        )
        Decisions = @(
            "Review application discovery logic to prevent premature journey creation"
            "Consider moving app detection out of lead process entirely"
            "Tie latest lead date reset into existing ticket (166716)"
            "Continue lead journey for existing contacts rather than reset"
            "Prioritize app-to-connect communication strategy over duplicate journey creation"
            "Automate voicemail blast through Salesforce action creation"
        )
        Summary = "Fourth session reviewed lead journey logic and application discovery process. Team identified issues with premature app-to-connect journey creation and discussed consolidating application detection logic. Major focus on latest lead date behavior and whether new leads should reset journey progression. Also addressed voicemail automation with Connect team and action log creation from Salesforce to streamline communication workflows."
    }
    
    "Journey Pipeline Optimization - Disc. Session 5" = @{
        Keywords = @("returning students", "stage field accuracy", "enrollment status", "drop/add logic", "term planning", "current term", "next term", "stage transitions", "PeopleSoft data", "enrollment calculations", "unknown stage values", "integration defects", "student status validation")
        Topics = @(
            "Returning student journey evaluation"
            "Stage field accuracy and data quality issues"
            "Enrollment status determination logic"
            "Drop/add process handling"
            "Term planning and enrollment calculations"
            "Current term vs next term transitions"
            "Unknown stage value troubleshooting"
            "PeopleSoft integration defect tracking"
        )
        Decisions = @(
            "Track unknown stage values as integration defects for resolution"
            "Pass problematic records to integrations team for data fixes"
            "Separate evaluation of applicant experience vs enrollment status"
            "Maintain term-specific fields for current and future enrollment"
            "Document stage calculation issues with specific student examples"
            "Continue term flip timing discussions with registrar"
        )
        Summary = "Fifth session focused on returning student journeys and stage field accuracy issues. Team discussed enrollment status calculations, drop/add logic, and term transitions. Major concern raised about unknown stage values indicating integration problems with PeopleSoft. Agreed to track defects systematically and pass problematic records to integrations team. Emphasized importance of accurate term-specific data for both applicant experience and enrollment tracking purposes."
    }
    
    "Admit Term Data Definition" = @{
        Keywords = @("readmit", "admit type", "career", "program level", "discontinuation", "GR14 vs GRAD", "special tuition", "new program", "regular readmit", "degree completion", "application criteria", "Europe", "Asia", "campus differences")
        Topics = @(
            "Readmit definition and classification criteria"
            "Admit type field logic and usage"
            "Career vs program level readmit identification"
            "Regular readmit vs readmit new program distinction"
            "Graduate program admit type variations (GR14 vs GRAD)"
            "Special tuition program handling"
            "Two-year discontinuation threshold"
            "Campus-specific admit types (Europe/Asia)"
        )
        Decisions = @(
            "Readmit applies to any student reapplying to same career after previous admission"
            "Regular readmit = student discontinued and returned to same program"
            "Readmit new program = student switching degree types within career"
            "Readmit is program-level, not plan-level (degree type not specialization)"
            "Enrollment completion is not factor in readmit determination"
            "Europe and Asia have separate admit types but follow same logic"
        )
        Summary = "Discussion session defining readmit criteria and admit type logic for student readmission scenarios. Team clarified that readmit status applies at program level (degree type) rather than plan level (specialization), and applies to any student reapplying after previous admission regardless of degree completion. Distinguished between regular readmit (same program) and readmit new program (degree type change). Addressed graduate program variations and campus-specific admit types for international locations."
    }
    
    "Program Status Data " = @{
        Keywords = @("program status", "enrollment status", "active status", "withdrawn", "completed", "data definitions", "status transitions", "registration requirements", "degree completion", "program changes")
        Topics = @(
            "Program status field definitions"
            "Status transition criteria and timing"
            "Active vs enrolled status distinctions"
            "Withdrawn student handling"
            "Degree completion status tracking"
            "Program change impact on status"
            "Registration requirement timing"
            "Status data accuracy challenges"
        )
        Decisions = @(
            "Define clear criteria for each program status value"
            "Establish status transition rules and timing"
            "Clarify registration requirement thresholds"
            "Document status change triggers"
        )
        Summary = "Discussion of program status data definitions and status transition logic. Team reviewed various program status values, their meanings, and when students transition between statuses. Focused on ensuring accurate status tracking for active enrollment, withdrawals, and degree completion scenarios."
    }
    
    "Re-admit Population Follow up " = @{
        Keywords = @("readmit population", "discontinued students", "re-engagement", "outreach campaigns", "student identification", "data segmentation", "marketing communication", "enrollment recovery", "status tracking")
        Topics = @(
            "Readmit population identification and segmentation"
            "Discontinued student outreach strategies"
            "Re-engagement campaign requirements"
            "Data accuracy for readmit targeting"
            "Student status verification for campaigns"
            "Enrollment recovery communication"
            "Readmit vs new student distinction"
            "Campaign timing and triggers"
        )
        Decisions = @(
            "Improve readmit population identification accuracy"
            "Segment discontinued students for targeted re-engagement"
            "Coordinate readmit communications with admissions"
            "Verify student status before campaign launch"
            "Track readmit campaign effectiveness"
        )
        Summary = "Follow-up discussion on readmit population targeting and discontinued student re-engagement strategies. Team reviewed campaign requirements, data segmentation needs, and coordination points between marketing and admissions for readmit outreach. Emphasized importance of accurate student status identification and campaign timing for enrollment recovery efforts."
    }
}

# Process each wiki page
$markdownFiles = Get-ChildItem -Path $WikiPagesPath -Filter "*.md" | Sort-Object Name

foreach ($file in $markdownFiles) {
    $pageName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    
    if (-not $sessionAnalysis.ContainsKey($pageName)) {
        Write-Host "Skipping $pageName - no analysis data available" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Processing: $pageName" -ForegroundColor Cyan
    
    $analysis = $sessionAnalysis[$pageName]
    $content = Get-Content -Path $file.FullName -Raw
    
    # Build the new sections
    $keywordSection = @"
## Keywords

``````
$($analysis.Keywords -join ", ")
``````

"@
    
    $topicsSection = @"
## Key Topics Discussed

$($analysis.Topics | ForEach-Object { "- $_" } | Out-String)
"@
    
    $decisionsSection = @"
## Key Decisions Made

$($analysis.Decisions | ForEach-Object { "- $_" } | Out-String)
"@
    
    $summarySection = @"
## Session Summary

$($analysis.Summary)

"@
    
    # Insert new sections after "## Overview" and before "[[_TOC_]]"
    $newSections = $keywordSection + $summarySection + $topicsSection + $decisionsSection
    
    # Replace content by finding the TOC marker
    $content = $content -replace '(\[\[_TOC_\]\])', "$newSections`$1"
    
    # Save updated content
    $content | Out-File -FilePath $file.FullName -Encoding UTF8 -NoNewline
    
    Write-Host "  ✅ Added analysis sections to $pageName" -ForegroundColor Green
}

Write-Host "`n✅ Analysis complete!" -ForegroundColor Green

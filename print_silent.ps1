param([string]$FilePath, [string]$PrinterName = "")

function Set-DefaultPrinter {
    param($Name)
    $printer = Get-WmiObject -Query "Select * From Win32_Printer Where Name = '$Name'"
    if ($printer) { 
        $printer.SetDefaultPrinter() | Out-Null
        return $true
    }
    return $false
}

$oldDefault = ""
if ($PrinterName -ne "") {
    $current = Get-WmiObject -Query "Select * From Win32_Printer Where Default = TRUE"
    if ($current) { $oldDefault = $current.Name }
    Set-DefaultPrinter -Name $PrinterName
}

# --- REGISTRY HACK: Disable Headers/Footers ---
$regKey = "HKCU:\Software\Microsoft\Internet Explorer\PageSetup"
$backupProps = @{}

try {
    # Backup current settings
    $props = Get-ItemProperty -Path $regKey -ErrorAction SilentlyContinue
    if ($props) {
        $backupProps["header"] = $props.header
        $backupProps["footer"] = $props.footer
        $backupProps["margin_bottom"] = $props.margin_bottom
        $backupProps["margin_left"] = $props.margin_left
        $backupProps["margin_right"] = $props.margin_right
        $backupProps["margin_top"] = $props.margin_top
    }

    # Set to Empty/Zero
    Set-ItemProperty -Path $regKey -Name "header" -Value ""
    Set-ItemProperty -Path $regKey -Name "footer" -Value ""
    Set-ItemProperty -Path $regKey -Name "margin_bottom" -Value "0.0"
    Set-ItemProperty -Path $regKey -Name "margin_left" -Value "0.0"
    Set-ItemProperty -Path $regKey -Name "margin_right" -Value "0.0"
    Set-ItemProperty -Path $regKey -Name "margin_top" -Value "0.0"
}
catch {
    Write-Warning "Could not modify registry for PageSetup. Headers may still appear."
}
# ----------------------------------------------

try {
    $ie = New-Object -ComObject InternetExplorer.Application
    $ie.Visible = $false
    $ie.Navigate($FilePath)
    
    # Wait for load
    while ($ie.Busy -or $ie.ReadyState -ne 4) { Start-Sleep -Milliseconds 100 }
    
    # 6 = OLECMDID_PRINT, 2 = OLECMDEXECOPT_DONTPROMPTUSER
    $ie.ExecWB(6, 2)
    
    # Give it time to spool
    Start-Sleep -Seconds 5
    
    $ie.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ie) | Out-Null
}
catch {
    Write-Error $_
}
finally {
    if ($ie) {
        try { $ie.Quit() } catch {}
        try { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ie) | Out-Null } catch {}
    }
}

if ($oldDefault -ne "") {
    Set-DefaultPrinter -Name $oldDefault
}

# --- RESTORE REGISTRY ---
if ($backupProps.Count -gt 0) {
    try {
        Set-ItemProperty -Path $regKey -Name "header" -Value $backupProps["header"]
        Set-ItemProperty -Path $regKey -Name "footer" -Value $backupProps["footer"]
        Set-ItemProperty -Path $regKey -Name "margin_bottom" -Value $backupProps["margin_bottom"]
        Set-ItemProperty -Path $regKey -Name "margin_left" -Value $backupProps["margin_left"]
        Set-ItemProperty -Path $regKey -Name "margin_right" -Value $backupProps["margin_right"]
        Set-ItemProperty -Path $regKey -Name "margin_top" -Value $backupProps["margin_top"]
    }
    catch {}
}

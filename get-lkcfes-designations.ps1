$data = Get-Content 'lib/tools/staff_directory.json' | ConvertFrom-Json
$lkcfes = $data.faculties.'LKC FES'

$designations = @{}
foreach ($dept in $lkcfes.departments.PSObject.Properties) {
    foreach ($staff in $dept.Value.staff) {
        $des = $staff.designation
        if ($des) {
            if (-not $designations.ContainsKey($des)) {
                $designations[$des] = 0
            }
            $designations[$des]++
        }
    }
}

Write-Host ""
Write-Host "=== LKC FES Designation Summary ==="
Write-Host ""
Write-Host "Designation                 | Count"
Write-Host "----------------------------|------"

$total = 0
$designations.GetEnumerator() | Sort-Object Name | ForEach-Object {
    $name = $_.Name.PadRight(27)
    Write-Host "$name | $($_.Value)"
    $total += $_.Value
}

Write-Host "----------------------------|------"
$totalPadded = "TOTAL".PadRight(27)
Write-Host "$totalPadded | $total"

// KPI Dashboard JavaScript
// ไฟล์นี้จัดการการแสดงผล KPI Dashboard

let statusChart, departmentChart, trendChart, statusPercentChart;
let monthlyPerformanceChart, paretoChart;
let currentKPIData = null; // เก็บข้อมูล KPI ปัจจุบัน

// เรียกใช้เมื่อโหลดหน้าเสร็จ
$(document).ready(function() {
    // Set default date range (current month)
    setDateRange('month');
    
    // Load filter options (department, branch)
    loadFilterOptions();
    
    // Load KPI data
    loadKPIData();
});

// ตั้งค่าช่วงวันที่
function setDateRange(range) {
    const today = new Date();
    let dateFrom = new Date();
    let dateTo = new Date();
    
    switch(range) {
        case 'today':
            dateFrom = today;
            break;
        case 'week':
            dateFrom.setDate(today.getDate() - 7);
            break;
        case 'month':
            dateFrom.setDate(1); // First day of current month
            break;
        case 'lastMonth':
            dateFrom.setMonth(today.getMonth() - 1);
            dateFrom.setDate(1);
            dateTo.setMonth(today.getMonth());
            dateTo.setDate(0); // Last day of previous month
            break;
        case 'year':
            dateFrom.setMonth(0);
            dateFrom.setDate(1);
            break;
    }
    
    // Format dates as YYYY-MM-DD
    $('#dateFrom').val(formatDate(dateFrom));
    $('#dateTo').val(formatDate(dateTo));
    
    // Auto load data
    loadKPIData();
}

// Format date to YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// โหลดข้อมูล KPI
function loadKPIData() {
    const dateFrom = $('#dateFrom').val();
    const dateTo = $('#dateTo').val();
    const department = $('#filterDepartment').val();
    const branch = $('#filterBranch').val();
    const status = $('#filterStatus').val();
    
    if (!dateFrom || !dateTo) {
        alert('กรุณาเลือกช่วงวันที่');
        return;
    }
    
    // Show loading
    $('#loadingOverlay').fadeIn();
    
    $.ajax({
        url: '../api/kpi_data.php',
        method: 'GET',
        data: {
            date_from: dateFrom,
            date_to: dateTo,
            department: department,
            branch: branch,
            status: status
        },
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                currentKPIData = response.data; // เก็บข้อมูลไว้
                updateKPICards(response.data);
                updateCharts(response.data);
                updateTables(response.data);
                checkThresholdAlerts(response.data);
            } else {
                alert('เกิดข้อผิดพลาด: ' + response.message);
            }
        },
        error: function(xhr, status, error) {
            console.error('Error:', error);
            alert('ไม่สามารถโหลดข้อมูลได้: ' + error);
        },
        complete: function() {
            // Hide loading
            $('#loadingOverlay').fadeOut();
        }
    });
}

// อัปเดต KPI Cards
function updateKPICards(data) {
    const summary = data.summary;
    const comparison = data.comparison || {};
    
    // Update Key Metrics Section
    $('#keyTotalRepairs').text(summary.total_repairs || 0);
    
    const totalRepairs = parseInt(summary.total_repairs) || 0;
    const completedRepairs = parseInt(summary.completed_count) || 0;
    const successRate = totalRepairs > 0 ? ((completedRepairs / totalRepairs) * 100).toFixed(1) : 0;
    $('#keySuccessRate').text(successRate);
    
    const mtbfDays = parseFloat(data.overall_mtbf?.mtbf_days) || 0;
    $('#keyMtbfDays').text(mtbfDays.toFixed(1));
    
    const totalCost = parseFloat(data.cost_stats.total_cost) || 0;
    $('#keyTotalCost').text(totalCost.toLocaleString('th-TH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }));
    
    // Update regular KPI cards
    $('#totalRepairs').text(summary.total_repairs || 0);
    addTrendBadge('#totalRepairs', summary.total_repairs, comparison.total_repairs);
    
    $('#pendingRepairs').text(summary.pending_count || 0);
    $('#inProgressRepairs').text(summary.in_progress_count || 0);
    $('#waitingPartsRepairs').text(summary.waiting_parts_count || 0);
    $('#completedRepairs').text(summary.completed_count || 0);
    
    // Success Rate (already calculated above)
    $('#successRate').text(successRate);
    addTrendBadge('#successRate', successRate, comparison.success_rate);
    
    // Total work hours
    let totalWorkHours = 0;
    if (data.work_hours_stats && Array.isArray(data.work_hours_stats)) {
        data.work_hours_stats.forEach(stat => {
            totalWorkHours += parseFloat(stat.total_hours) || 0;
        });
    }
    $('#totalWorkHours').text(totalWorkHours.toFixed(1));
    
    // Total downtime hours
    let totalDowntimeHours = 0;
    if (data.downtime_hours_stats && Array.isArray(data.downtime_hours_stats)) {
        data.downtime_hours_stats.forEach(stat => {
            totalDowntimeHours += parseFloat(stat.total_hours) || 0;
        });
    }
    $('#totalDowntimeHours').text(totalDowntimeHours.toFixed(1));
    
    // Total cost (already calculated and formatted above, just update the card)
    $('#totalCost').text(totalCost.toLocaleString('th-TH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }));
    
    // MTTR (Mean Time To Repair)
    const mttr = parseFloat(summary.avg_repair_hours) || 0;
    $('#mttrHours').text(mttr.toFixed(1));
    addTrendBadge('#mttrHours', mttr, comparison.mttr, true); // true = lower is better
    
    // Response Time
    const responseTime = parseFloat(summary.avg_approval_minutes) || 0;
    $('#responseTime').text(responseTime.toFixed(0));
    addTrendBadge('#responseTime', responseTime, comparison.response_time, true);
    
    // OEE (Overall Equipment Effectiveness) — commented out, pending formula discussion
    /*
    // OEE = Availability × Performance × Quality
    // Simplified: (Total Time - Downtime) / Total Time × Success Rate
    const totalTime = totalWorkHours + totalDowntimeHours;
    const availability = totalTime > 0 ? ((totalTime - totalDowntimeHours) / totalTime) : 0;
    const quality = successRate / 100;
    const oee = (availability * quality * 100).toFixed(1);
    $('#oeePercent').text(oee);
    addTrendBadge('#oeePercent', oee, comparison.oee);
    */
    
    // First Time Fix Rate — card hidden (identical to Success Rate; requires repeat-visit tracking)
    /*
    const firstTimeFixRate = parseFloat(summary.first_time_fix_rate) || 0;
    $('#firstTimeFixRate').text(firstTimeFixRate.toFixed(1));
    addTrendBadge('#firstTimeFixRate', firstTimeFixRate, comparison.first_time_fix_rate);
    */
}

// อัปเดตกราฟทั้งหมด
function updateCharts(data) {
    updateStatusChart(data.status_stats);
    updateStatusPercentChart(data.summary);
    updateDepartmentChart(data.department_stats);
    updateTrendChart(data.daily_trend);
    updateMonthlyPerformanceChart(data.monthly_performance);
    updateParetoChart(data.failure_causes);
    updateMTBFData(data.overall_mtbf, data.mtbf_data);
}

// กราฟวงกลมแสดงสถานะ
function updateStatusChart(statusData) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    // Destroy existing chart
    if (statusChart) {
        statusChart.destroy();
    }
    
    // Prepare data
    const labels = [];
    const counts = [];
    const colors = [];
    
    // สถานะ: 10=รออนุมัติ, 11=ไม่อนุมัติ, 20=ดำเนินการ, 30=รออะไหล่, 40=ซ่อมเสร็จสิ้น
    const statusColors = {
        '10': '#ffc107',
        '11': '#dc3545',
        '20': '#17a2b8',
        '30': '#ff9800',
        '40': '#28a745'
    };
    
    const statusLabels = {
        '10': 'รออนุมัติ',
        '11': 'ไม่อนุมัติ',
        '20': 'ดำเนินการ',
        '30': 'รออะไหล่',
        '40': 'ซ่อมเสร็จสิ้น'
    };
    
    statusData.forEach(item => {
        labels.push(statusLabels[item.status] || item.status);
        counts.push(parseInt(item.count));
        colors.push(statusColors[item.status] || '#6c757d');
    });
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 14,
                            family: 'Sarabun'
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} รายการ (${percentage}%)`;
                        },
                        // afterLabel: function(context) {
                        //     return 'คลิกเพื่อดูรายละเอียด';
                        // }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { size: 14, family: 'Sarabun', weight: 'bold' },
                    bodyFont: { size: 13, family: 'Sarabun' },
                    padding: 12,
                    displayColors: true
                }
            },
            // onClick: (event, elements) => {
            //     if (elements.length > 0) {
            //         const index = elements[0].index;
            //         const status = Object.keys(statusLabels)[index];
            //         showStatusDetails(status, statusLabels[status]);
            //     }
            // }
        }
    });
}

// กราฟวงกลมแสดงเปอร์เซ็นต์สถานะงานซ่อม (กำลังซ่อม, รออะไหล่, เสร็จสิ้น)
function updateStatusPercentChart(summary) {
    const ctx = document.getElementById('statusPercentChart').getContext('2d');
    
    // Destroy existing chart
    if (statusPercentChart) {
        statusPercentChart.destroy();
    }
    
    const inProgress = parseInt(summary.in_progress_count) || 0;
    const waitingParts = parseInt(summary.waiting_parts_count) || 0;
    const completed = parseInt(summary.completed_count) || 0;
    
    const total = inProgress + waitingParts + completed;
    
    // Calculate percentages
    const inProgressPercent = total > 0 ? ((inProgress / total) * 100).toFixed(1) : 0;
    const waitingPartsPercent = total > 0 ? ((waitingParts / total) * 100).toFixed(1) : 0;
    const completedPercent = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
    
    statusPercentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [
                `กำลังซ่อม (${inProgressPercent}%)`,
                `รออะไหล่ (${waitingPartsPercent}%)`,
                `เสร็จสิ้น (${completedPercent}%)`
            ],
            datasets: [{
                data: [inProgress, waitingParts, completed],
                backgroundColor: [
                    'rgba(23, 162, 184, 0.8)',  // สีฟ้า - กำลังซ่อม
                    'rgba(255, 152, 0, 0.8)',   // สีส้ม - รออะไหล่
                    'rgba(40, 167, 69, 0.8)'    // สีเขียว - เสร็จสิ้น
                ],
                borderColor: [
                    'rgba(23, 162, 184, 1)',
                    'rgba(255, 152, 0, 1)',
                    'rgba(40, 167, 69, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 14,
                            family: 'Sarabun'
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return `${label}: ${value} รายการ`;
                        }
                    }
                }
            }
        }
    });
}

// กราฟแท่งแสดงสถิติตามแผนก
function updateDepartmentChart(deptData) {
    const ctx = document.getElementById('departmentChart').getContext('2d');
    
    // Destroy existing chart
    if (departmentChart) {
        departmentChart.destroy();
    }
    
    // Prepare data
    const labels = deptData.map(item => item.department || 'ไม่ระบุ');
    const repairCounts = deptData.map(item => parseInt(item.repair_count));
    const completedCounts = deptData.map(item => parseInt(item.completed_count));
    
    departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'แจ้งซ่อมทั้งหมด',
                    data: repairCounts,
                    backgroundColor: 'rgba(102, 126, 234, 0.7)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2
                },
                {
                    label: 'เสร็จสิ้น',
                    data: completedCounts,
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            family: 'Sarabun'
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '15%',
                    ticks: {
                        stepSize: 1,
                        font: {
                            family: 'Sarabun'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Sarabun'
                        }
                    }
                }
            }
        }
    });
}

// กราฟเส้นแสดงแนวโน้มรายวัน
function updateTrendChart(trendData) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    // Destroy existing chart
    if (trendChart) {
        trendChart.destroy();
    }
    
    // Prepare data
    const labels = trendData.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
    });
    
    const repairCounts = trendData.map(item => parseInt(item.repair_count));
    const completedCounts = trendData.map(item => parseInt(item.completed_count));
    const inProgressCounts = trendData.map(item => parseInt(item.in_progress_count));
    const waitingPartsCounts = trendData.map(item => parseInt(item.waiting_parts_count || 0));
    const pendingCounts = trendData.map(item => parseInt(item.pending_count));
    const rejectedCounts = trendData.map(item => parseInt(item.rejected_count || 0));
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'แจ้งซ่อมทั้งหมด',
                    data: repairCounts,
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'เสร็จสิ้น',
                    data: completedCounts,
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'กำลังซ่อม',
                    data: inProgressCounts,
                    borderColor: 'rgba(23, 162, 184, 1)',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'รออนุมัติ',
                    data: pendingCounts,
                    borderColor: 'rgba(255, 193, 7, 1)',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'รออะไหล่',
                    data: waitingPartsCounts,
                    borderColor: 'rgba(255, 152, 0, 1)',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            family: 'Sarabun'
                        },
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '15%',
                    ticks: {
                        stepSize: 1,
                        font: {
                            family: 'Sarabun'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Sarabun'
                        },
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// อัปเดตตาราง
function updateTables(data) {
    updateFrequentMachinesTable(data.frequent_machines);
    updateTechnicianTable(data.technician_stats);
    updateExpensiveMachinesTable(data.expensive_machines);
    updateBranchTable(data.branch_stats);
}

// ตารางเครื่องจักรที่มีปัญหาบ่อย
function updateFrequentMachinesTable(machines) {
    const tbody = $('#frequentMachinesTable tbody');
    tbody.empty();
    
    if (machines.length === 0) {
        tbody.append('<tr><td colspan="4" class="text-center text-muted">ไม่มีข้อมูล</td></tr>');
        return;
    }
    
    machines.forEach((machine, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${machine.machine_number || '-'}</strong></td>
                <td class="text-center"><span class="badge badge-warning">${machine.repair_count}</span></td>
                <td class="text-center"><span class="badge badge-success">${machine.completed_count}</span></td>
            </tr>
        `;
        tbody.append(row);
    });
}

// ตารางช่างที่ทำงานมากที่สุด
function updateTechnicianTable(technicians) {
    const tbody = $('#technicianTable tbody');
    tbody.empty();
    
    if (technicians.length === 0) {
        tbody.append('<tr><td colspan="4" class="text-center text-muted">ไม่มีข้อมูล</td></tr>');
        return;
    }
    
    technicians.forEach((tech, index) => {
        const avgHours = parseFloat(tech.avg_hours) || 0;
        const totalHours = parseFloat(tech.total_hours) || 0;
        
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${tech.technician}</strong></td>
                <td class="text-center"><span class="badge badge-info">${tech.job_count}</span></td>
                <td class="text-center">${totalHours.toFixed(1)} ชม.</td>
            </tr>
        `;
        tbody.append(row);
    });
}

// ตารางเครื่องจักรที่มีค่าใช้จ่ายสูงสุด
function updateExpensiveMachinesTable(machines) {
    const tbody = $('#expensiveMachinesTable tbody');
    tbody.empty();
    
    if (machines.length === 0) {
        tbody.append('<tr><td colspan="6" class="text-center text-muted">ไม่มีข้อมูล</td></tr>');
        return;
    }
    
    machines.forEach((machine, index) => {
        const totalCost = parseFloat(machine.total_cost) || 0;
        const avgCost = parseFloat(machine.avg_cost) || 0;
        
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${machine.machine_code || '-'}</strong></td>
                <td>${machine.machine_name || '-'}</td>
                <td class="text-center"><span class="badge badge-info">${machine.repair_count}</span></td>
                <td class="text-right"><strong class="text-danger">${totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                <td class="text-right">${avgCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `;
        tbody.append(row);
    });
}

// ตารางสถิติตามสาขา
function updateBranchTable(branches) {
    const tbody = $('#branchTable tbody');
    tbody.empty();
    
    if (branches.length === 0) {
        tbody.append('<tr><td colspan="5" class="text-center text-muted">ไม่มีข้อมูล</td></tr>');
        return;
    }
    
    branches.forEach((branch, index) => {
        const repairCount = parseInt(branch.repair_count);
        const completedCount = parseInt(branch.completed_count);
        const successRate = repairCount > 0 ? (completedCount / repairCount * 100).toFixed(1) : 0;
        
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${branch.branch || 'ไม่ระบุ'}</strong></td>
                <td class="text-center"><span class="badge badge-primary">${repairCount}</span></td>
                <td class="text-center"><span class="badge badge-success">${completedCount}</span></td>
                <td class="text-center"><strong>${successRate}%</strong></td>
            </tr>
        `;
        tbody.append(row);
    });
}

// กราฟประสิทธิภาพรายเดือน
function updateMonthlyPerformanceChart(monthlyData) {
    const ctx = document.getElementById('monthlyPerformanceChart').getContext('2d');
    
    if (monthlyPerformanceChart) {
        monthlyPerformanceChart.destroy();
    }
    
    if (!monthlyData || monthlyData.length === 0) {
        ctx.fillText('ไม่มีข้อมูล', 200, 150);
        return;
    }
    
    const labels = monthlyData.map(m => {
        const [year, month] = m.month.split('-');
        return `${month}/${year}`;
    });
    const totalRepairs = monthlyData.map(m => parseInt(m.total_repairs));
    const completedRepairs = monthlyData.map(m => parseInt(m.completed_repairs));
    const completionRate = monthlyData.map(m => parseFloat(m.completion_rate));
    
    monthlyPerformanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'การซ่อมทั้งหมด',
                data: totalRepairs,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'ซ่อมเสร็จสิ้น',
                data: completedRepairs,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'อัตราความสำเร็จ (%)',
                data: completionRate,
                borderColor: '#ffc107',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grace: '15%',
                    title: {
                        display: true,
                        text: 'จำนวนการซ่อม'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grace: '15%',
                    title: {
                        display: true,
                        text: 'อัตราความสำเร็จ (%)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

// Pareto Chart - สาเหตุหลักของการเสีย
function updateParetoChart(failureCauses) {
    const ctx = document.getElementById('paretoChart').getContext('2d');
    
    if (paretoChart) {
        paretoChart.destroy();
    }
    
    if (!failureCauses || failureCauses.length === 0) {
        ctx.fillText('ไม่มีข้อมูล', 200, 150);
        return;
    }
    
    // คำนวณ total, percentage และ cumulative จาก count จริง
    const totalCount = failureCauses.reduce((s, c) => s + parseInt(c.count), 0);
    let cumulative = 0;
    const data = failureCauses.map(cause => {
        const pct = totalCount > 0 ? (parseInt(cause.count) / totalCount) * 100 : 0;
        cumulative += pct;
        return {
            cause: cause.cause,
            count: parseInt(cause.count),
            percentage: pct,
            cumulative: Math.min(cumulative, 100)
        };
    });
    
    const labels = data.map(d => {
        const maxLength = 30;
        return d.cause.length > maxLength ? d.cause.substring(0, maxLength) + '...' : d.cause;
    });
    const counts = data.map(d => d.count);
    const cumulativePercentages = data.map(d => d.cumulative);
    
    paretoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวนครั้ง',
                data: counts,
                backgroundColor: 'rgba(220, 53, 69, 0.7)',
                borderColor: '#dc3545',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: 'เปอร์เซ็นต์สะสม (%)',
                data: cumulativePercentages,
                type: 'line',
                borderColor: '#ffc107',
                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: false,
                    text: 'กฎ 80/20: 80% ของปัญหามาจาก 20% ของสาเหตุ',
                    font: {
                        size: 12
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grace: '15%',
                    title: {
                        display: true,
                        text: 'จำนวนครั้ง'
                    },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'เปอร์เซ็นต์สะสม (%)'
                    },
                    min: 0,
                    max: 100,
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        }
    });
}

// อัปเดตข้อมูล MTBF
function updateMTBFData(overallMtbf, mtbfData) {
    // อัปเดต MTBF Cards
    $('#totalFailures').text(overallMtbf.total_failures || 0);
    $('#totalPeriodDays').text((overallMtbf.total_period_hours / 24).toFixed(1));
    $('#mtbfHours').text(overallMtbf.mtbf_hours.toFixed(1));
    $('#mtbfDays').text(overallMtbf.mtbf_days.toFixed(2));
    
    // อัปเดตตาราง MTBF
    updateMTBFTable(mtbfData);
}

// ตาราง MTBF ตามเครื่องจักร
function updateMTBFTable(mtbfData) {
    const tbody = $('#mtbfTable tbody');
    tbody.empty();
    
    if (!mtbfData || mtbfData.length === 0) {
        tbody.append('<tr><td colspan="6" class="text-center text-muted">ไม่มีข้อมูล</td></tr>');
        return;
    }
    
    mtbfData.forEach((machine, index) => {
        const mtbfHours = parseFloat(machine.mtbf_hours) || 0;
        const mtbfDays = parseFloat(machine.mtbf_days) || 0;
        const lastFailure = new Date(machine.last_failure).toLocaleDateString('th-TH');
        
        // กำหนดสีตาม MTBF (วัน)
        let mtbfClass = 'success';
        if (mtbfDays < 7) {
            mtbfClass = 'danger';
        } else if (mtbfDays < 30) {
            mtbfClass = 'warning';
        }
        
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${machine.machine_number || '-'}</strong></td>
                <td class="text-center"><span class="badge badge-danger">${machine.failure_count}</span></td>
                <td class="text-center">${mtbfHours.toFixed(1)}</td>
                <td class="text-center"><span class="badge badge-${mtbfClass}">${mtbfDays.toFixed(2)}</span></td>
                <td class="text-center">${lastFailure}</td>
            </tr>
        `;
        tbody.append(row);
    });
}

// ==================== New Functions ====================

// Load filter options (departments and branches)
function loadFilterOptions() {
    $.ajax({
        url: '../api/kpi_data.php',
        method: 'GET',
        data: { action: 'get_filters' },
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                // Populate departments
                const deptSelect = $('#filterDepartment');
                if (response.data.departments) {
                    response.data.departments.forEach(dept => {
                        deptSelect.append(`<option value="${dept}">${dept}</option>`);
                    });
                }
                
                // Populate branches
                const branchSelect = $('#filterBranch');
                if (response.data.branches) {
                    response.data.branches.forEach(branch => {
                        branchSelect.append(`<option value="${branch}">${branch}</option>`);
                    });
                }
            }
        }
    });
}

// Clear all filters
function clearFilters() {
    $('#filterDepartment').val('');
    $('#filterBranch').val('');
    $('#filterStatus').val('');
    setDateRange('month'); // Reset to current month
}

// Add trend badge to show comparison with previous period
function addTrendBadge(selector, currentValue, previousValue, lowerIsBetter = false) {
    if (previousValue === undefined || previousValue === null) return;
    
    const $element = $(selector).parent();
    $element.find('.trend-badge').remove(); // Remove existing badge
    
    const current = parseFloat(currentValue) || 0;
    const previous = parseFloat(previousValue) || 0;
    
    if (previous === 0) return;
    
    const percentChange = ((current - previous) / previous * 100).toFixed(1);
    let badgeClass = '';
    let icon = '';
    
    if (lowerIsBetter) {
        // For metrics where lower is better (MTTR, Response Time)
        if (current < previous) {
            badgeClass = 'trend-up';
            icon = '<i class="fas fa-arrow-down"></i>';
        } else if (current > previous) {
            badgeClass = 'trend-down';
            icon = '<i class="fas fa-arrow-up"></i>';
        }
    } else {
        // For metrics where higher is better
        if (current > previous) {
            badgeClass = 'trend-up';
            icon = '<i class="fas fa-arrow-up"></i>';
        } else if (current < previous) {
            badgeClass = 'trend-down';
            icon = '<i class="fas fa-arrow-down"></i>';
        }
    }
    
    if (badgeClass) {
        $(selector).after(`<span class="trend-badge ${badgeClass}">${icon} ${Math.abs(percentChange)}%</span>`);
    }
}

// Check threshold alerts
function checkThresholdAlerts(data) {
    const alerts = [];
    const thresholds = getThresholds();
    
    // Check MTBF
    const mtbfDays = parseFloat(data.overall_mtbf.mtbf_days) || 0;
    if (mtbfDays > 0 && mtbfDays < thresholds.mtbf) {
        alerts.push({
            type: 'danger',
            message: `🔴 MTBF ต่ำกว่า ${thresholds.mtbf} วัน (ปัจจุบัน: ${mtbfDays.toFixed(2)} วัน) - ต้องดูแลเร่งด่วน!`
        });
    }
    
    // Check MTTR
    const mttr = parseFloat(data.summary.avg_repair_hours) || 0;
    if (mttr > thresholds.mttr) {
        alerts.push({
            type: 'danger',
            message: `🔴 MTTR สูงกว่า ${thresholds.mttr} ชั่วโมง (ปัจจุบัน: ${mttr.toFixed(1)} ชม.) - ใช้เวลาซ่อมนานเกินไป!`
        });
    }
    
    // Check success rate
    const totalRepairs = parseInt(data.summary.total_repairs) || 0;
    const completedRepairs = parseInt(data.summary.completed_count) || 0;
    const successRate = totalRepairs > 0 ? ((completedRepairs / totalRepairs) * 100) : 0;
    if (successRate < thresholds.successRate) {
        alerts.push({
            type: 'warning',
            message: `⚠️ อัตราความสำเร็จต่ำกว่า ${thresholds.successRate}% (ปัจจุบัน: ${successRate.toFixed(1)}%)`
        });
    }
    
    // Check pending repairs
    const pendingCount = parseInt(data.summary.pending_count) || 0;
    if (pendingCount > thresholds.pending) {
        alerts.push({
            type: 'warning',
            message: `⚠️ มีใบแจ้งซ่อมรออนุมัติ ${pendingCount} รายการ (เกินเกณฑ์ ${thresholds.pending} รายการ)`
        });
    }
    
    // Check OEE — commented out, pending formula discussion
    /*
    const totalWorkHours = parseFloat(data.cost_stats.total_work_hours) || 0;
    const totalDowntimeHours = parseFloat(data.cost_stats.total_downtime_hours) || 0;
    const totalTime = totalWorkHours + totalDowntimeHours;
    const availability = totalTime > 0 ? ((totalTime - totalDowntimeHours) / totalTime) : 0;
    const quality = successRate / 100;
    const oee = (availability * quality * 100);
    
    if (oee > 0 && oee < thresholds.oee) {
        alerts.push({
            type: 'warning',
            message: `⚠️ OEE ต่ำกว่า ${thresholds.oee}% (ปัจจุบัน: ${oee.toFixed(1)}%) - ประสิทธิภาพต่ำ`
        });
    }
    */
    
    // Check Response Time
    const responseTime = parseFloat(data.summary.avg_approval_minutes) || 0;
    if (responseTime > thresholds.responseTime) {
        alerts.push({
            type: 'warning',
            message: `⚠️ เวลาตอบสนองสูงกว่า ${thresholds.responseTime} นาที (ปัจจุบัน: ${responseTime.toFixed(0)} นาที)`
        });
    }
    
    // Check Downtime
    if (totalDowntimeHours > thresholds.downtime) {
        alerts.push({
            type: 'warning',
            message: `⚠️ เวลาหยุดเครื่องสูงกว่า ${thresholds.downtime} ชั่วโมง (ปัจจุบัน: ${totalDowntimeHours.toFixed(1)} ชม.)`
        });
    }
    
    // Display alerts
    displayAlerts(alerts);
}

// Display alert notifications
function displayAlerts(alerts) {
    // Remove existing alerts
    $('.alert-notification').remove();
    
    if (alerts.length === 0) return;
    
    const alertContainer = $('<div class="alert-notification" style="position: fixed; top: 80px; right: 20px; z-index: 9998; max-width: 400px;"></div>');
    
    alerts.forEach(alert => {
        const alertBox = $(`
            <div class="alert alert-${alert.type} alert-dismissible fade show mb-2" role="alert">
                ${alert.message}
                <button type="button" class="close" data-dismiss="alert">
                    <span>&times;</span>
                </button>
            </div>
        `);
        alertContainer.append(alertBox);
    });
    
    $('body').append(alertContainer);
    
    // Auto dismiss after 10 seconds
    setTimeout(() => {
        alertContainer.fadeOut(500, function() {
            $(this).remove();
        });
    }, 10000);
}

// Export to PDF
function exportToPDF() {
    if (!currentKPIData) {
        alert('กรุณาโหลดข้อมูลก่อนส่งออก');
        return;
    }
    
    alert('กำลังสร้าง PDF... (ใช้เวลาสักครู่)');
    
    // Hide buttons and filters for cleaner export
    $('.btn, .filter-section').hide();
    
    html2canvas(document.body, {
        scale: 2,
        logging: false,
        useCORS: true
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const dateFrom = $('#dateFrom').val();
        const dateTo = $('#dateTo').val();
        pdf.save(`KPI-Dashboard-${dateFrom}-to-${dateTo}.pdf`);
        
        // Show buttons and filters again
        $('.btn, .filter-section').show();
    }).catch(error => {
        console.error('PDF export error:', error);
        alert('เกิดข้อผิดพลาดในการสร้าง PDF');
        $('.btn, .filter-section').show();
    });
}

// Export to Excel
function exportToExcel() {
    if (!currentKPIData) {
        alert('กรุณาโหลดข้อมูลก่อนส่งออก');
        return;
    }
    
    const data = currentKPIData;
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Summary
    const summaryData = [
        ['KPI Dashboard Summary'],
        ['Date Range', $('#dateFrom').val() + ' to ' + $('#dateTo').val()],
        [''],
        ['Metric', 'Value'],
        ['Total Repairs', data.summary.total_repairs || 0],
        ['Pending', data.summary.pending_count || 0],
        ['In Progress', data.summary.in_progress_count || 0],
        ['Waiting Parts', data.summary.waiting_parts_count || 0],
        ['Completed', data.summary.completed_count || 0],
        ['Total Cost', data.cost_stats.total_cost || 0],
        ['MTBF (days)', data.overall_mtbf.mtbf_days || 0],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
    
    // Sheet 2: Frequent Machines
    if (data.frequent_machines && data.frequent_machines.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(data.frequent_machines);
        XLSX.utils.book_append_sheet(wb, ws2, 'Frequent Machines');
    }
    
    // Sheet 3: Department Stats
    if (data.department_stats && data.department_stats.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(data.department_stats);
        XLSX.utils.book_append_sheet(wb, ws3, 'Departments');
    }
    
    // Sheet 4: Technician Stats
    if (data.technician_stats && data.technician_stats.length > 0) {
        const ws4 = XLSX.utils.json_to_sheet(data.technician_stats);
        XLSX.utils.book_append_sheet(wb, ws4, 'Technicians');
    }
    
    // Sheet 5: MTBF Data
    if (data.mtbf_data && data.mtbf_data.length > 0) {
        const ws5 = XLSX.utils.json_to_sheet(data.mtbf_data);
        XLSX.utils.book_append_sheet(wb, ws5, 'MTBF');
    }
    
    // Save file
    const dateFrom = $('#dateFrom').val();
    const dateTo = $('#dateTo').val();
    XLSX.writeFile(wb, `KPI-Dashboard-${dateFrom}-to-${dateTo}.xlsx`);
}

// Show status details (drill-down)
function showStatusDetails(status, statusLabel) {
    const dateFrom = $('#dateFrom').val();
    const dateTo = $('#dateTo').val();
    
    // Create modal
    const modalHtml = `
        <div class="modal fade" id="statusDetailModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">รายละเอียด: ${statusLabel}</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center">
                            <i class="fas fa-spinner fa-spin fa-2x"></i>
                            <p>กำลังโหลดข้อมูล...</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">ปิด</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    $('#statusDetailModal').remove();
    
    // Add and show modal
    $('body').append(modalHtml);
    $('#statusDetailModal').modal('show');
    
    // Load data via AJAX
    $.ajax({
        url: '../api/get_repair_details.php',
        method: 'GET',
        data: {
            status: status,
            date_from: dateFrom,
            date_to: dateTo
        },
        dataType: 'json',
        success: function(response) {
            if (response.success && response.data) {
                let tableHtml = `
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>รหัสเครื่อง</th>
                                    <th>แผนก</th>
                                    <th>ปัญหา</th>
                                    <th>วันที่แจ้ง</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                response.data.forEach((item, index) => {
                    const date = new Date(item.start_job).toLocaleDateString('th-TH');
                    tableHtml += `
                        <tr>
                            <td>${index + 1}</td>
                            <td><strong>${item.machine_number}</strong></td>
                            <td>${item.department || '-'}</td>
                            <td>${item.issue || '-'}</td>
                            <td>${date}</td>
                        </tr>
                    `;
                });
                
                tableHtml += `
                            </tbody>
                        </table>
                    </div>
                    <p class="text-muted mt-3"><small>จำนวนทั้งหมด: ${response.data.length} รายการ</small></p>
                `;
                
                $('#statusDetailModal .modal-body').html(tableHtml);
            } else {
                $('#statusDetailModal .modal-body').html('<p class="text-danger">ไม่สามารถโหลดข้อมูลได้</p>');
            }
        },
        error: function() {
            $('#statusDetailModal .modal-body').html('<p class="text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>');
        }
    });
}

// Show machine details when clicking on table rows
$(document).on('click', '#frequentMachinesTable tbody tr, #mtbfTable tbody tr', function() {
    const machineNumber = $(this).find('td:eq(1) strong').text().trim();
    if (machineNumber && machineNumber !== '-') {
        showMachineHistory(machineNumber);
    }
});

// Show machine repair history
function showMachineHistory(machineNumber) {
    const modalHtml = `
        <div class="modal fade" id="machineHistoryModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-xl" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">ประวัติการซ่อม: ${machineNumber}</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center">
                            <i class="fas fa-spinner fa-spin fa-2x"></i>
                            <p>กำลังโหลดข้อมูล...</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">ปิด</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#machineHistoryModal').remove();
    $('body').append(modalHtml);
    $('#machineHistoryModal').modal('show');
    
    $.ajax({
        url: '../api/get_machine_history.php',
        method: 'GET',
        data: { machine_number: machineNumber },
        dataType: 'json',
        timeout: 10000,
        success: function(response) {
            if (response.success && response.data) {
                const rows = response.data;
                const totalCost = rows.reduce((s, r) => s + (parseFloat(r.total_cost) || 0), 0);
                const totalHours = rows.reduce((s, r) => s + (parseFloat(r.work_hours) || parseFloat(r.calc_hours) || 0), 0);
                let html = `
                    <div class="row mb-3">
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h6>จำนวนครั้งทั้งหมด</h6>
                                    <h3 class="text-primary">${rows.length}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h6>ซ่อมเสร็จ</h6>
                                    <h3 class="text-success">${rows.filter(r => String(r.status) == '40').length}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h6>ค่าใช้จ่ายรวม</h6>
                                    <h3 class="text-danger">${totalCost.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ฿</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h6>เวลารวม</h6>
                                    <h3 class="text-warning">${totalHours.toFixed(1)} ชม.</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>เลขที่</th>
                                    <th>วันที่</th>
                                    <th>ปัญหา</th>
                                    <th>สถานะ</th>
                                    <th>ช่าง</th>
                                    <th class="text-right">เวลา (ชม.)</th>
                                    <th class="text-right">ค่าใช้จ่าย (฿)</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                if (rows.length === 0) {
                    html += '<tr><td colspan="8" class="text-center text-muted">ไม่พบประวัติการซ่อมสำหรับเครื่องนี้</td></tr>';
                }
                rows.forEach((item, index) => {
                    try {
                        const dateVal = item.start_job ? new Date(item.start_job.replace(' ', 'T')).toLocaleDateString('th-TH') : '-';
                        const statusMap = { '10': ['secondary','รออนุมัติ'], '11': ['danger','ไม่อนุมัติ'], '20': ['warning','ดำเนินการ'], '30': ['info','รออะไหล่'], '40': ['success','เสร็จสิ้น'], '50': ['dark','ยกเลิก'] };
                        const [statusBadge, statusText] = statusMap[String(item.status)] || ['secondary', item.status];
                        const docNo = item.document_no ? `<a href="../pages/print_form.php?id=${item.id}" target="_blank">${item.document_no}</a>` : '-';
                        const hours = item.work_hours ? parseFloat(item.work_hours).toFixed(1) : (item.calc_hours ? parseFloat(item.calc_hours).toFixed(1) : '-');
                        const cost = item.total_cost ? parseFloat(item.total_cost).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-';
                        html += `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${docNo}</td>
                                <td>${dateVal}</td>
                                <td>${item.issue || '-'}</td>
                                <td><span class="badge badge-${statusBadge}">${statusText}</span></td>
                                <td>${item.handled_by || '-'}</td>
                                <td class="text-right">${hours}</td>
                                <td class="text-right">${cost}</td>
                            </tr>
                        `;
                    } catch(e) {
                        console.error('Error rendering row', index, e);
                    }
                });
                
                html += `
                            </tbody>
                        </table>
                    </div>
                `;
                
                $('#machineHistoryModal .modal-body').html(html);
            } else {
                $('#machineHistoryModal .modal-body').html('<div class="alert alert-warning">ไม่พบข้อมูลประวัติการซ่อม</div>');
            }
        },
        error: function(xhr, textStatus, errorThrown) {
            let msg = 'ไม่สามารถเชื่อมต่อ API ได้';
            if (textStatus === 'timeout') {
                msg = 'หมดเวลารอ (timeout)';
            } else if (xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            } else if (xhr.responseText) {
                msg = 'Server response: ' + xhr.responseText.substring(0, 200);
            }
            $('#machineHistoryModal .modal-body').html(
                '<div class="alert alert-danger"><strong>เกิดข้อผิดพลาด [' + xhr.status + ']:</strong> ' + msg + '</div>'
            );
        },
        complete: function(xhr, textStatus) {
            // Fallback: ถ้า modal ยังแสดง loading อยู่ให้แสดง error
            if ($('#machineHistoryModal .modal-body .fa-spinner').length > 0) {
                $('#machineHistoryModal .modal-body').html(
                    '<div class="alert alert-warning">ไม่ได้รับการตอบกลับจากเซิร์ฟเวอร์ (status: ' + textStatus + ')</div>'
                );
            }
        }
    });
}

// ==================== Threshold Settings Functions ====================

// Default thresholds
const DEFAULT_THRESHOLDS = {
    mtbf: 7,              // วัน
    mttr: 24,             // ชั่วโมง
    successRate: 70,      // %
    pending: 10,          // รายการ
    oee: 60,              // %
    responseTime: 60,     // นาที
    downtime: 100         // ชั่วโมง
};

// Get thresholds from localStorage or use defaults
function getThresholds() {
    const stored = localStorage.getItem('kpi_thresholds');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing thresholds:', e);
            return DEFAULT_THRESHOLDS;
        }
    }
    return DEFAULT_THRESHOLDS;
}

// Show threshold settings modal
function showThresholdSettings() {
    const thresholds = getThresholds();
    
    // Populate form with current values
    $('#mtbfThreshold').val(thresholds.mtbf);
    $('#mttrThreshold').val(thresholds.mttr);
    $('#successRateThreshold').val(thresholds.successRate);
    $('#pendingThreshold').val(thresholds.pending);
    $('#oeeThreshold').val(thresholds.oee);
    $('#responseTimeThreshold').val(thresholds.responseTime);
    $('#downtimeThreshold').val(thresholds.downtime);
    
    $('#thresholdSettingsModal').modal('show');
}

// Save threshold settings
function saveThresholds() {
    const thresholds = {
        mtbf: parseFloat($('#mtbfThreshold').val()) || DEFAULT_THRESHOLDS.mtbf,
        mttr: parseFloat($('#mttrThreshold').val()) || DEFAULT_THRESHOLDS.mttr,
        successRate: parseFloat($('#successRateThreshold').val()) || DEFAULT_THRESHOLDS.successRate,
        pending: parseInt($('#pendingThreshold').val()) || DEFAULT_THRESHOLDS.pending,
        oee: parseFloat($('#oeeThreshold').val()) || DEFAULT_THRESHOLDS.oee,
        responseTime: parseFloat($('#responseTimeThreshold').val()) || DEFAULT_THRESHOLDS.responseTime,
        downtime: parseFloat($('#downtimeThreshold').val()) || DEFAULT_THRESHOLDS.downtime
    };
    
    // Validate values
    if (thresholds.mtbf < 1 || thresholds.mtbf > 365) {
        alert('MTBF ต้องอยู่ระหว่าง 1-365 วัน');
        return;
    }
    if (thresholds.mttr < 1 || thresholds.mttr > 720) {
        alert('MTTR ต้องอยู่ระหว่าง 1-720 ชั่วโมง');
        return;
    }
    if (thresholds.successRate < 0 || thresholds.successRate > 100) {
        alert('Success Rate ต้องอยู่ระหว่าง 0-100%');
        return;
    }
    if (thresholds.oee < 0 || thresholds.oee > 100) {
        alert('OEE ต้องอยู่ระหว่าง 0-100%');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('kpi_thresholds', JSON.stringify(thresholds));
    
    // Show success message
    alert('✅ บันทึกการตั้งค่าเรียบร้อยแล้ว!\n\nระบบจะใช้ค่าใหม่ในการแจ้งเตือนทันที');
    
    // Close modal
    $('#thresholdSettingsModal').modal('hide');
    
    // Re-check alerts with new thresholds
    if (currentKPIData) {
        checkThresholdAlerts(currentKPIData);
    }
}

// Reset to default thresholds
function resetThresholds() {
    if (confirm('คุณต้องการรีเซ็ตค่ากลับเป็นค่าเริ่มต้นใช่หรือไม่?')) {
        localStorage.removeItem('kpi_thresholds');
        
        // Reload form with defaults
        $('#mtbfThreshold').val(DEFAULT_THRESHOLDS.mtbf);
        $('#mttrThreshold').val(DEFAULT_THRESHOLDS.mttr);
        $('#successRateThreshold').val(DEFAULT_THRESHOLDS.successRate);
        $('#pendingThreshold').val(DEFAULT_THRESHOLDS.pending);
        $('#oeeThreshold').val(DEFAULT_THRESHOLDS.oee);
        $('#responseTimeThreshold').val(DEFAULT_THRESHOLDS.responseTime);
        $('#downtimeThreshold').val(DEFAULT_THRESHOLDS.downtime);
        
        alert('✅ รีเซ็ตค่ากลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว!');
    }
}

// Display current thresholds in console for debugging
function showCurrentThresholds() {
    const thresholds = getThresholds();
    console.log('📊 Current Alert Thresholds:', thresholds);
    return thresholds;
}

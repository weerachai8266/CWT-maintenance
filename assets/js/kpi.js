// KPI Dashboard JavaScript
// ไฟล์นี้จัดการการแสดงผล KPI Dashboard

let statusChart, departmentChart, trendChart, statusPercentChart;
let monthlyPerformanceChart, paretoChart;

// เรียกใช้เมื่อโหลดหน้าเสร็จ
$(document).ready(function() {
    // Set default date range (current month)
    setDateRange('month');
    
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
            date_to: dateTo
        },
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                updateKPICards(response.data);
                updateCharts(response.data);
                updateTables(response.data);
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
    
    $('#totalRepairs').text(summary.total_repairs || 0);
    $('#pendingRepairs').text(summary.pending_count || 0);
    $('#inProgressRepairs').text(summary.in_progress_count || 0);
    $('#waitingPartsRepairs').text(summary.waiting_parts_count || 0);
    $('#completedRepairs').text(summary.completed_count || 0);
    
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
    
    // Total cost
    const totalCost = parseFloat(data.cost_stats.total_cost) || 0;
    $('#totalCost').text(totalCost.toLocaleString('th-TH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }));
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
    
    // สถานะ: 10=รออนุมัติ, 11=ไม่อนุมัติ, 20=รอดำเนินการ, 30=รออะไหล่, 40=ซ่อมเสร็จสิ้น
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
        '20': 'รอดำเนินการ',
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
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
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
                    title: {
                        display: true,
                        text: 'จำนวนการซ่อม'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
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
    
    // คำนวณ cumulative percentage
    let cumulative = 0;
    const data = failureCauses.map(cause => {
        cumulative += parseFloat(cause.percentage);
        return {
            cause: cause.cause,
            count: parseInt(cause.count),
            percentage: parseFloat(cause.percentage),
            cumulative: cumulative
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
                    display: true,
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

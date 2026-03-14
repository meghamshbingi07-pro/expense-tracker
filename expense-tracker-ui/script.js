const API_URL = "http://localhost:8080/expenses";

let chart;
let categoryChart;
let allExpenses = []; // Store all expenses for filtering
let currentEditId = null; // Track which expense is being edited
let currentCategoryFilter = "";
let currentTimeFilter = "";
let currentQuickFilter = "all";
let currentSearchQuery = "";
let monthlyBudget = 20000;

function updateThemeButton(theme){
const btn = document.getElementById("themeToggle");
if (!btn) return;

btn.textContent = theme === "light"
? "☀ Switch to Dark"
: "🌙 Switch to Light";
}

function getChartThemeColors() {
    const isLightMode = document.body.classList.contains("light-mode");
    return {
        textColor: isLightMode ? "#10234d" : "#cbd5e1",
        gridColor: isLightMode ? "rgba(15, 35, 77, 0.16)" : "rgba(255,255,255,0.08)",
        chartAreaBg: isLightMode ? "#f5f8ff" : "rgba(15, 23, 42, 0.42)",
        lineBorder: isLightMode ? "#1d4ed8" : "#ff6ec4",
        lineFill: isLightMode ? "rgba(29, 78, 216, 0.18)" : "rgba(255, 110, 196, 0.2)",
        barColors: isLightMode
            ? ["#1D4ED8", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0E7490"]
            : ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#A855F7", "#14B8A6"]
    };
}

const chartAreaBackgroundPlugin = {
    id: "chartAreaBackground",
    beforeDraw(chart, _args, pluginOptions) {
        const chartArea = chart.chartArea;
        if (!chartArea) {
            return;
        }

        const color = pluginOptions?.color;
        if (!color) {
            return;
        }

        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
        ctx.restore();
    }
};

function applyTheme(theme){
if (theme === "light") {
    document.body.classList.add("light-mode");
} else {
    document.body.classList.remove("light-mode");
}

localStorage.setItem("theme", theme);
updateThemeButton(theme);

// Re-render active charts so axis and legend text stay readable per theme.
if (allExpenses.length) {
    applyActiveFilters();
}
}

function toggleTheme(){
let theme = document.body.classList.contains("light-mode") ? "dark" : "light";
applyTheme(theme);
}

function updateBudget(expenses = allExpenses){
let total = expenses.reduce((sum,e)=>sum + Number(e.amount),0);

let percent = (total / monthlyBudget) * 100;

if(percent > 100){
percent = 100;
}

const budgetAmount = document.getElementById("budgetAmount");
const budgetProgress = document.getElementById("budgetProgress");
const budgetText = document.getElementById("budgetText");

if (budgetAmount) {
    budgetAmount.innerText = `₹${monthlyBudget.toLocaleString()}`;
}
if (budgetProgress) {
    budgetProgress.style.width = percent + "%";
}
if (budgetText) {
    budgetText.innerText = `₹${total.toLocaleString()} spent`;
}

if(total > monthlyBudget){
showNotification("⚠ Budget exceeded!");
}
}

function animateValue(id,start,end,duration,prefix=""){
    const target = document.getElementById(id);
    if (!target) {
        return;
    }

    if (start === end) {
        target.innerText = prefix + end.toLocaleString();
        return;
    }

    const startTime = performance.now();
    const totalDuration = Math.max(180, duration);

    function tick(currentTime) {
        const progress = Math.min((currentTime - startTime) / totalDuration, 1);
        // Ease out for a snappy finish while keeping larger totals smooth.
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(start + (end - start) * eased);
        target.innerText = prefix + value.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    }

    requestAnimationFrame(tick);
}

function showToast(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "toast-error" : "toast-success"}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "toastOut 0.28s ease forwards";
        setTimeout(() => toast.remove(), 280);
    }, 2200);
}

function showNotification(message){
    let container = document.getElementById("notification-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "notification-container";
        document.body.appendChild(container);
    }

    const notification = document.createElement("div");
    notification.className = "notification";
    notification.innerText = message;
    container.appendChild(notification);

    setTimeout(()=>{
        notification.remove();
    },3000);
}

function isInTimeRange(dateString, timeFilter) {
    if (!timeFilter) {
        return true;
    }

    const expenseDate = new Date(dateString);
    const now = new Date();

    if (timeFilter === "year") {
        return expenseDate.getFullYear() === now.getFullYear();
    }

    if (timeFilter === "month") {
        return expenseDate.getFullYear() === now.getFullYear() && expenseDate.getMonth() === now.getMonth();
    }

    if (timeFilter === "week") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayOfWeek = today.getDay();
        const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - startOffset);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return expenseDate >= weekStart && expenseDate <= weekEnd;
    }

    return true;
}

function getFilteredExpenses() {
    return allExpenses.filter(exp => {
        const categoryMatch = !currentCategoryFilter || exp.category === currentCategoryFilter;
        const timeMatch = isInTimeRange(exp.date, currentTimeFilter);
        const quickFilterMatch = isInQuickFilter(exp.date);
        const searchMatch = !currentSearchQuery ||
            exp.category.toLowerCase().includes(currentSearchQuery) ||
            exp.description.toLowerCase().includes(currentSearchQuery) ||
            String(exp.amount).includes(currentSearchQuery);
        return categoryMatch && timeMatch && quickFilterMatch && searchMatch;
    });
}

function isInQuickFilter(dateString) {
    if (!currentQuickFilter || currentQuickFilter === "all") {
        return true;
    }

    const expenseDate = new Date(dateString);
    const today = new Date();

    if (currentQuickFilter === "today") {
        return expenseDate.toDateString() === today.toDateString();
    }

    if (currentQuickFilter === "month") {
        return expenseDate.getMonth() === today.getMonth() && expenseDate.getFullYear() === today.getFullYear();
    }

    if (currentQuickFilter === "year") {
        return expenseDate.getFullYear() === today.getFullYear();
    }

    return true;
}

function applyFilter(){
    const filterEl = document.getElementById("filterSelect");
    currentQuickFilter = filterEl ? filterEl.value : "all";

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.value = "";
    }
    currentSearchQuery = "";

    applyActiveFilters();
    updateCategorySummary(getFilteredExpenses());
}

function searchExpenses(){
    const searchInput = document.getElementById("searchInput");
    currentSearchQuery = searchInput ? searchInput.value.toLowerCase() : "";

    // Keep monthly trend + category chart + cards in sync with search results.
    applyActiveFilters();
}

function updateCategorySummary(data = allExpenses){
    const categoryTotals = {};

    data.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    });

    const summary = document.getElementById("categorySummary");
    if (!summary) {
        return;
    }

    summary.innerHTML = "";

    Object.entries(categoryTotals)
        .sort((a,b)=> b[1] - a[1])
        .forEach(([category,total])=>{
            summary.innerHTML += `
<div class="category-row">
<span class="category-name">${category}</span>
<span class="category-amount">₹${Number(total).toLocaleString()}</span>
</div>
`;
        });
}

function renderFilteredTable(list){
    const table = document.getElementById("expenseTable") || document.getElementById("expenseList");
    if (!table) {
        return;
    }

    table.innerHTML = "";

    if(list.length === 0){
        table.innerHTML = "<tr><td colspan='5'>No expenses yet</td></tr>";
        return;
    }

    list.forEach((e,index)=>{
        const deleteArg = e.id === undefined ? index : e.id;
        table.innerHTML += `
<tr>
<td>₹${e.amount}</td>
<td>${getEmoji(e.category)} ${e.category}</td>
<td>${e.date}</td>
<td>${e.description}</td>
<td>
    <button onclick="editExpense(${deleteArg})" class="action-btn edit-btn" title="Edit">✏️</button>
    <button onclick="deleteExpense(${deleteArg})" class="action-btn delete-btn" title="Delete">🗑️</button>
</td>
</tr>
`;
    });
}

function updateDashboard(data = allExpenses){
    const total = data.reduce((sum,e)=>sum + Number(e.amount),0);

    const totalExpenseEl = document.getElementById("totalExpense");
    if (totalExpenseEl) {
        totalExpenseEl.innerText = "₹" + total.toLocaleString();
    }

    const transactionEl = document.getElementById("transactions") || document.getElementById("totalTransactions");
    if (transactionEl) {
        transactionEl.innerText = data.length;
    }

    updateTopCategory(data);
}

function updateTopCategory(data = allExpenses){

    const categoryTotals = {};

    data.forEach(e=>{
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    });

    let top = "-";

    const categoryKeys = Object.keys(categoryTotals);

    if(categoryKeys.length){
        top = categoryKeys
            .reduce((a,b)=> categoryTotals[a] > categoryTotals[b] ? a : b, categoryKeys[0]);
    }

    const topCategoryEl = document.getElementById("topCategory");
    if (topCategoryEl) {
        topCategoryEl.innerText = top;
    }
}

function renderFilteredView(expensesToRender, animateCounters = false) {
    renderFilteredTable(expensesToRender);

    if (animateCounters) {
        const total = expensesToRender.reduce((sum, exp) => sum + Number(exp.amount), 0);
        animateValue("totalExpense", 0, total, 340, "₹");
        animateValue("totalTransactions", 0, expensesToRender.length, 520);
        updateTopCategory(expensesToRender);
    } else {
        updateDashboard(expensesToRender);
    }

    updateBudget(expensesToRender);
    updateCategorySummary(expensesToRender);
    loadChart(expensesToRender);
}

function applyActiveFilters(animateCounters = false) {
    const filteredExpenses = getFilteredExpenses();
    renderFilteredView(filteredExpenses, animateCounters);
}

function getEmoji(category){
    const map = {
        Food: "🍔",
        Travel: "✈️",
        Shopping: "🛍️",
        Bills: "💡",
        Entertainment: "🎮",
        Transportation: "🚗",
        Healthcare: "🏥",
        Education: "📚",
        Groceries: "🛒",
        Utilities: "⚡"
    }
    return map[category] || "💰";
}

async function populateSampleData() {
    const now = new Date();
    const isoDateDaysAgo = (daysAgo) => {
        const d = new Date(now);
        d.setDate(now.getDate() - daysAgo);
        return d.toISOString().split("T")[0];
    };

    const sampleExpenses = [
        // Student-friendly data over the last 3 months
        { amount: 2800, category: "Bills", date: isoDateDaysAgo(82), description: "Hostel rent share" },
        { amount: 350, category: "Utilities", date: isoDateDaysAgo(79), description: "Mobile recharge and data" },
        { amount: 210, category: "Food", date: isoDateDaysAgo(76), description: "Canteen meals" },
        { amount: 420, category: "Groceries", date: isoDateDaysAgo(72), description: "Monthly snacks and toiletries" },
        { amount: 190, category: "Education", date: isoDateDaysAgo(68), description: "Lab printouts" },
        { amount: 560, category: "Transportation", date: isoDateDaysAgo(64), description: "City bus pass" },
        { amount: 260, category: "Entertainment", date: isoDateDaysAgo(60), description: "Movie and popcorn" },
        { amount: 330, category: "Shopping", date: isoDateDaysAgo(56), description: "Notebook set and pens" },
        { amount: 2450, category: "Bills", date: isoDateDaysAgo(52), description: "Hostel rent share" },
        { amount: 140, category: "Healthcare", date: isoDateDaysAgo(49), description: "Cold medicines" },
        { amount: 680, category: "Transportation", date: isoDateDaysAgo(45), description: "Train ticket home" },
        { amount: 520, category: "Education", date: isoDateDaysAgo(41), description: "Semester reference books" },
        { amount: 230, category: "Food", date: isoDateDaysAgo(36), description: "Group lunch after exam" },
        { amount: 470, category: "Groceries", date: isoDateDaysAgo(32), description: "Hostel pantry refill" },
        { amount: 300, category: "Utilities", date: isoDateDaysAgo(28), description: "Wi-Fi contribution" },
        { amount: 240, category: "Entertainment", date: isoDateDaysAgo(24), description: "College fest ticket" },
        { amount: 380, category: "Shopping", date: isoDateDaysAgo(20), description: "USB drive and calculator" },
        { amount: 2650, category: "Bills", date: isoDateDaysAgo(16), description: "Hostel rent share" },
        { amount: 175, category: "Food", date: isoDateDaysAgo(12), description: "Cafe study snacks" },
        { amount: 250, category: "Education", date: isoDateDaysAgo(8), description: "Assignment binding" },
        { amount: 620, category: "Transportation", date: isoDateDaysAgo(6), description: "Auto and metro for internship" },
        { amount: 160, category: "Healthcare", date: isoDateDaysAgo(4), description: "First-aid supplies" },
        { amount: 450, category: "Groceries", date: isoDateDaysAgo(3), description: "Weekly groceries shared" },
        { amount: 220, category: "Food", date: isoDateDaysAgo(1), description: "Dinner with classmates" }
    ];

    try {
        // Seed only when DB is empty so real user data is preserved.
        const response = await fetch(API_URL);
        const existingData = await response.json();
        if (Array.isArray(existingData) && existingData.length > 0) {
            return;
        }

        for (const expense of sampleExpenses) {
            await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(expense)
            });
        }
    } catch {
        console.log("Database not ready yet, will retry...");
    }
}

function addExpense(){

let expense = {
amount: Number(document.getElementById("amount").value),
category: document.getElementById("category").value,
date: document.getElementById("date").value,
description: document.getElementById("description").value
}

// Validation
if (!expense.amount || !expense.category || !expense.date || !expense.description) {
    alert("Please fill in all fields!");
    return;
}

// Show loading
document.querySelector(".expense-form").innerHTML += '<div class="loading"></div>';

// Determine if editing or adding
const method = currentEditId ? "PUT" : "POST";
const url = currentEditId ? `${API_URL}/${currentEditId}` : API_URL;
const isEditMode = Boolean(currentEditId);

fetch(url,{
method: method,
headers:{
"Content-Type":"application/json"
},
body: JSON.stringify(expense)
})
.then(res => res.json())
.then(data => {

// Hide loading
const loader = document.querySelector(".loading");
if (loader) loader.remove();

// Add to activity log
const now = new Date();
const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
const action = currentEditId ? "Updated" : "Added";
document.getElementById("activityLog").innerHTML =
`<li>${timeString}: ${action} ₹${expense.amount} for ${expense.category} - ${expense.description}</li>` + 
document.getElementById("activityLog").innerHTML;
showToast(`₹${expense.amount.toLocaleString()} ${expense.category} ${currentEditId ? "updated" : "added"} successfully`);
if (!isEditMode) {
    showNotification("Expense Added Successfully");
}
updateCategorySummary(getFilteredExpenses());

// Reset form
document.getElementById("amount").value = "";
document.getElementById("category").value = "";
document.getElementById("date").value = new Date().toISOString().split('T')[0];
document.getElementById("description").value = "";
currentEditId = null;

// Update button text
const btn = document.querySelector(".expense-form button");
btn.textContent = "Add Expense";
btn.style.background = "";

// Animate container
document.querySelector(".main").animate(
[{transform:"scale(1)"},{transform:"scale(1.02)"},{transform:"scale(1)"}],
{duration:300}
)

loadExpenses()
updateBudget();

})
.catch(error => {
    const loader = document.querySelector(".loading");
    if (loader) loader.remove();
    alert("Error saving expense: " + error.message);
    showToast("Unable to save expense", "error");
});
}

// deletion helper
function deleteExpense(id){
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    // Find expense for activity log
    const expense = allExpenses.find(exp => exp.id === id);
    
    fetch(`${API_URL}/${id}`, {method:'DELETE'})
    .then(() => {
        // Add to activity log
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        if (expense) {
            document.getElementById("activityLog").innerHTML =
                `<li>${timeString}: Deleted ₹${expense.amount} - ${expense.category}</li>` + 
                document.getElementById("activityLog").innerHTML;
            showToast(`₹${Number(expense.amount).toLocaleString()} ${expense.category} deleted`);
        }
        showNotification("Expense Deleted");
        updateCategorySummary(getFilteredExpenses());
        
        // Animate deletion
        document.querySelector(".main").animate(
            [{opacity:1},{opacity:0.8},{opacity:1}],
            {duration:500}
        );
        
        loadExpenses();
        updateBudget();
    })
    .catch(error => {
        alert("Error deleting expense: " + error.message);
        showToast("Unable to delete expense", "error");
    });
}

function loadExpenses(){

fetch(API_URL)
.then(res => res.json())
.then(data => {

allExpenses = data; // Store for filtering
applyActiveFilters(true)

})

}

function loadChart(expenses){

const monthlyCanvas = document.getElementById("monthlyChart");
if(!monthlyCanvas){
return;
}

if(chart){
chart.destroy()
}

// Monthly chart with only existing months
const monthlyTotalsByKey = {};

expenses.forEach(exp => {
    // Calculate monthly totals
    const expenseDate = new Date(exp.date);
    const year = expenseDate.getFullYear();
    const month = String(expenseDate.getMonth() + 1).padStart(2, "0");
    const monthKey = `${year}-${month}`;
    monthlyTotalsByKey[monthKey] = (monthlyTotalsByKey[monthKey] || 0) + Number(exp.amount);
    
})

const sortedMonthKeys = Object.keys(monthlyTotalsByKey).sort((a, b) => a.localeCompare(b));
const monthLabels = sortedMonthKeys.map(key => {
    const [year, month] = key.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString("default", { month: "short", year: "2-digit" });
});
const monthValues = sortedMonthKeys.map(key => monthlyTotalsByKey[key]);
const themeColors = getChartThemeColors();

chart=new Chart(monthlyCanvas,{
    plugins: [chartAreaBackgroundPlugin],
    type:"line",
    data:{
        labels:monthLabels,
        datasets:[{
            label:"Monthly Expenses",
            data:monthValues,
            backgroundColor: themeColors.lineFill,
            borderColor: themeColors.lineBorder,
            borderWidth:3,
            fill:true,
            tension:0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: themeColors.lineBorder,
            pointBorderColor: themeColors.lineBorder
        }]
    },
    options:{
        responsive:true,
        maintainAspectRatio: false,
        devicePixelRatio: window.devicePixelRatio || 2,
        animation:{
            duration:1000,
            easing:"easeOutQuart"
        },
        plugins:{
            chartAreaBackground: {
                color: themeColors.chartAreaBg
            },
            title:{
                display:false
            },
            legend:{
                position:'bottom',
                labels:{
                    color: themeColors.textColor
                }
            }
        },
        scales:{
            y:{
                beginAtZero:true,
                ticks:{
                    color: themeColors.textColor,
                    callback: function(value) {
                        return '₹' + value.toLocaleString();
                    }
                },
                grid: {
                    color: themeColors.gridColor
                }
            },
            x:{
                ticks:{
                    color: themeColors.textColor
                },
                grid: {
                    color: themeColors.gridColor
                }
            }
        }
    }
})

updateCharts(expenses)
}

function updateCharts(expenses = allExpenses){
const ctx = document.getElementById("categoryChart");
if(!ctx){
return;
}

const themeColors = getChartThemeColors();

if(!categoryChart){
    categoryChart = new Chart(ctx, {
    plugins: [chartAreaBackgroundPlugin],
    type: "bar",

    data: {
    labels: [],
    datasets: [{
    label: "Expense Amount",
    data: [],
    backgroundColor: themeColors.barColors,
    borderRadius: 8
    }]
    },

    options: {

    indexAxis: "y",

    responsive: true,
    devicePixelRatio: window.devicePixelRatio || 2,
    maintainAspectRatio: false,
    animation:{
    duration:1000,
    easing:"easeOutQuart"
    },

    plugins: {

    chartAreaBackground: {
    color: themeColors.chartAreaBg
    },

    legend: {
    display: false
    },

    title: {
    display: false
    }

    },

    scales: {

    x: {
    ticks: {
    color: themeColors.textColor,
    callback: function(value) {
    return "₹" + Number(value).toLocaleString();
    }
    },
    grid: {
    color: themeColors.gridColor
    }
    },

    y: {
    ticks: {
    color: themeColors.textColor
    },
    grid: {
    display: false
    }
    }

    }

    }
    });
}

let categoryTotals = {};

expenses.forEach(e=>{
categoryTotals[e.category] =
(categoryTotals[e.category] || 0) + Number(e.amount);
});

let sorted = Object.entries(categoryTotals)
.sort((a,b)=>b[1]-a[1]);

let top = sorted.slice(0,5);

let other = sorted.slice(5);

let otherTotal = other.reduce((sum,e)=>sum+e[1],0);

if(otherTotal>0){
top.push(["Other",otherTotal]);
}

let labels = top.map(e=>e[0]);
let values = top.map(e=>e[1]);

categoryChart.data.labels = labels;
categoryChart.data.datasets[0].data = values;
categoryChart.data.datasets[0].backgroundColor = themeColors.barColors;

categoryChart.options.scales.x.ticks.color = themeColors.textColor;
categoryChart.options.scales.y.ticks.color = themeColors.textColor;
categoryChart.options.scales.x.grid.color = themeColors.gridColor;
categoryChart.options.plugins.chartAreaBackground.color = themeColors.chartAreaBg;

categoryChart.update();
}

function initializeApp() {
    populateSampleData()
        .then(() => {
            loadExpenses();

            // Add some sample activity log entries
            setTimeout(() => {
                const sampleActivities = [
                    "2 hours ago: Added ₹450 for Food - Lunch at restaurant",
                    "4 hours ago: Added ₹1200 for Travel - Flight tickets",
                    "Yesterday: Added ₹850 for Shopping - New clothes",
                    "2 days ago: Added ₹2500 for Bills - Electricity bill",
                    "3 days ago: Added ₹320 for Entertainment - Movie tickets"
                ];

                const activityLog = document.getElementById("activityLog");
                sampleActivities.forEach(activity => {
                    activityLog.innerHTML += `<li>${activity}</li>`;
                });
            }, 1000);
        })
        .catch(() => {
            loadExpenses();
        });
}

// Edit expense function
function editExpense(id) {
    const expense = allExpenses.find(exp => exp.id === id);
    if (!expense) return;
    
    // Populate form
    document.getElementById("amount").value = expense.amount;
    document.getElementById("category").value = expense.category;
    document.getElementById("date").value = expense.date;
    document.getElementById("description").value = expense.description;
    
    // Set edit mode
    currentEditId = id;
    
    // Change button text
    const btn = document.querySelector(".expense-form button");
    btn.textContent = "Update Expense";
    btn.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    
    // Scroll to form
    document.querySelector(".expense-form").scrollIntoView({ behavior: 'smooth' });
    
    // Add to activity log
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById("activityLog").innerHTML =
        `<li>${timeString}: Editing expense #${id}</li>` + 
        document.getElementById("activityLog").innerHTML;

    showNotification("Expense Updated");
    updateCategorySummary(getFilteredExpenses());

    updateBudget();
}

// Filter by category
function filterByCategory() {
    currentCategoryFilter = document.getElementById("categoryFilter").value;
    applyActiveFilters();

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const filterText = currentCategoryFilter ? `Filtered by ${currentCategoryFilter}` : "Showing all categories";
    document.getElementById("activityLog").innerHTML =
        `<li>${timeString}: ${filterText}</li>` + 
        document.getElementById("activityLog").innerHTML;
}

function filterByTimeRange() {
    currentTimeFilter = document.getElementById("timeFilter").value;
    applyActiveFilters();

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const filterLabel = {
        week: "This Week",
        month: "This Month",
        year: "This Year",
        "": "All Time"
    };
    document.getElementById("activityLog").innerHTML =
        `<li>${timeString}: Time filter - ${filterLabel[currentTimeFilter]}</li>` +
        document.getElementById("activityLog").innerHTML;
}

// Export to JSON
function exportToJSON() {
    const dataStr = JSON.stringify(allExpenses, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    
    // Add to activity log
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById("activityLog").innerHTML =
        `<li>${timeString}: Exported ${allExpenses.length} expenses to JSON</li>` + 
        document.getElementById("activityLog").innerHTML;
}

// Export to CSV
function exportToCSV() {
    if (allExpenses.length === 0) {
        alert("No expenses to export!");
        return;
    }
    
    // Create CSV header
    let csv = "Amount,Category,Date,Description\n";
    
    // Add data rows
    allExpenses.forEach(exp => {
        csv += `${exp.amount},"${exp.category}","${exp.date}","${exp.description}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    
    // Add to activity log
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById("activityLog").innerHTML =
        `<li>${timeString}: Exported ${allExpenses.length} expenses to CSV</li>` + 
        document.getElementById("activityLog").innerHTML;
}

// Generate Monthly Report
function generateMonthlyReport() {
    if (allExpenses.length === 0) {
        alert("No expenses to generate report!");
        return;
    }
    
    // Group by month
    const monthlyData = {};
    
    allExpenses.forEach(exp => {
        const date = new Date(exp.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                name: monthName,
                total: 0,
                count: 0,
                categories: {}
            };
        }
        
        monthlyData[monthKey].total += exp.amount;
        monthlyData[monthKey].count++;
        
        if (!monthlyData[monthKey].categories[exp.category]) {
            monthlyData[monthKey].categories[exp.category] = 0;
        }
        monthlyData[monthKey].categories[exp.category] += exp.amount;
    });
    
    // Create report HTML
    let reportHTML = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                padding: 30px; border-radius: 12px; color: white; 
                max-width: 800px; margin: 20px auto; 
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
        <h2 style="text-align: center; margin-bottom: 20px; font-size: 28px;">
            📊 Monthly Expense Report
        </h2>
        <p style="text-align: center; opacity: 0.9; margin-bottom: 30px;">
            Generated on ${new Date().toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            })}
        </p>
    `;
    
    // Sort by month (newest first)
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));
    
    sortedMonths.forEach(monthKey => {
        const data = monthlyData[monthKey];
        const avgPerTransaction = (data.total / data.count).toFixed(2);
        
        // Find top category
        const categories = Object.keys(data.categories);
        const topCategory = categories.reduce((a, b) =>
            data.categories[a] > data.categories[b] ? a : b,
            categories[0]
        );
        
        reportHTML += `
        <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); 
                    padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; font-size: 22px;">
                ${data.name}
            </h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div>
                    <p style="margin: 5px 0; opacity: 0.8;">Total Spent:</p>
                    <p style="margin: 0; font-size: 24px; font-weight: bold;">₹${data.total.toLocaleString()}</p>
                </div>
                <div>
                    <p style="margin: 5px 0; opacity: 0.8;">Transactions:</p>
                    <p style="margin: 0; font-size: 24px; font-weight: bold;">${data.count}</p>
                </div>
                <div>
                    <p style="margin: 5px 0; opacity: 0.8;">Average per Transaction:</p>
                    <p style="margin: 0; font-size: 20px; font-weight: bold;">₹${avgPerTransaction}</p>
                </div>
                <div>
                    <p style="margin: 5px 0; opacity: 0.8;">Top Category:</p>
                    <p style="margin: 0; font-size: 20px; font-weight: bold;">
                        ${getEmoji(topCategory)} ${topCategory} (₹${data.categories[topCategory].toLocaleString()})
                    </p>
                </div>
            </div>
            
            <details style="margin-top: 15px;">
                <summary style="cursor: pointer; opacity: 0.9; padding: 5px;">
                    View Category Breakdown
                </summary>
                <div style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px;">
        `;
        
        Object.keys(data.categories).sort((a, b) => 
            data.categories[b] - data.categories[a]
        ).forEach(cat => {
            const percentage = ((data.categories[cat] / data.total) * 100).toFixed(1);
            reportHTML += `
                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                    <span>${getEmoji(cat)} ${cat}</span>
                    <span>₹${data.categories[cat].toLocaleString()} (${percentage}%)</span>
                </div>
            `;
        });
        
        reportHTML += `
                </div>
            </details>
        </div>
        `;
    });
    
    reportHTML += `
        <div style="text-align: center; margin-top: 30px;">
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: white; color: #667eea; border: none; 
                           padding: 12px 30px; border-radius: 8px; 
                           font-size: 16px; font-weight: bold; 
                           cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                Close Report
            </button>
        </div>
    </div>
    `;
    
    // Display report
    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = reportHTML;
    reportContainer.style.position = 'fixed';
    reportContainer.style.top = '0';
    reportContainer.style.left = '0';
    reportContainer.style.right = '0';
    reportContainer.style.bottom = '0';
    reportContainer.style.background = 'rgba(0,0,0,0.8)';
    reportContainer.style.zIndex = '10000';
    reportContainer.style.overflowY = 'auto';
    reportContainer.style.padding = '20px';
    
    document.body.appendChild(reportContainer);
    
    // Add to activity log
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById("activityLog").innerHTML =
        `<li>${timeString}: Generated monthly report</li>` + 
        document.getElementById("activityLog").innerHTML;
}

initializeApp()
updateBudget();
updateCategorySummary();

let savedTheme = localStorage.getItem("theme");

applyTheme(savedTheme === "light" ? "light" : "dark");

const themeToggleBtn = document.getElementById("themeToggle");
if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", function (event) {
        event.preventDefault();
        toggleTheme();
    });
}

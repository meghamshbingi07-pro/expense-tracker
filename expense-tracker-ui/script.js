const API_URL = "http://localhost:8080/expenses";

let chart;
let pieChart;
let allExpenses = []; // Store all expenses for filtering
let currentEditId = null; // Track which expense is being edited

function animateValue(id,start,end,duration,prefix=""){
    let range=end-start;
    let current=start;
    let increment=end>start?1:-1;
    let stepTime=Math.abs(Math.floor(duration/range));
    let timer=setInterval(function(){
        current+=increment;
        document.getElementById(id).innerText=prefix + current.toLocaleString();
        if(current==end){
            clearInterval(timer);
        }
    },stepTime);
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
    const sampleExpenses = [
        // January
        { amount: 900, category: "Rent", date: "2024-01-05", description: "January rent" },
        { amount: 120, category: "Food", date: "2024-01-12", description: "Groceries" },
        { amount: 300, category: "Entertainment", date: "2024-01-20", description: "Concert" },
        // February
        { amount: 1100, category: "Travel", date: "2024-02-03", description: "Train tickets" },
        { amount: 250, category: "Bills", date: "2024-02-10", description: "Water bill" },
        { amount: 400, category: "Shopping", date: "2024-02-18", description: "Valentine gift" },
        // March (existing data)
        { amount: 450, category: "Food", date: "2024-03-01", description: "Lunch at restaurant" },
        { amount: 1200, category: "Travel", date: "2024-03-02", description: "Flight tickets" },
        { amount: 850, category: "Shopping", date: "2024-03-03", description: "New clothes" },
        { amount: 2500, category: "Bills", date: "2024-03-04", description: "Electricity bill" },
        { amount: 320, category: "Entertainment", date: "2024-03-05", description: "Movie tickets" },
        { amount: 150, category: "Transportation", date: "2024-03-06", description: "Uber ride" },
        { amount: 780, category: "Healthcare", date: "2024-03-07", description: "Doctor visit" },
        { amount: 1200, category: "Education", date: "2024-03-08", description: "Online course" },
        { amount: 650, category: "Groceries", date: "2024-03-09", description: "Weekly groceries" },
        { amount: 1800, category: "Utilities", date: "2024-03-10", description: "Internet bill" },
        { amount: 290, category: "Food", date: "2024-03-11", description: "Coffee and snacks" },
        { amount: 950, category: "Shopping", date: "2024-03-12", description: "Electronics" },
        { amount: 420, category: "Transportation", date: "2024-03-13", description: "Gas refill" },
        { amount: 680, category: "Entertainment", date: "2024-03-14", description: "Concert tickets" },
        { amount: 1100, category: "Travel", date: "2024-03-15", description: "Hotel booking" },
        { amount: 350, category: "Groceries", date: "2024-03-16", description: "Fresh produce" },
        { amount: 2200, category: "Bills", date: "2024-03-17", description: "Rent payment" },
        { amount: 180, category: "Food", date: "2024-03-18", description: "Breakfast" },
        { amount: 750, category: "Healthcare", date: "2024-03-19", description: "Pharmacy" },
        { amount: 520, category: "Shopping", date: "2024-03-20", description: "Home decor" }
    ];

    try {
        // clear all existing entries unconditionally
        const response = await fetch(API_URL);
        const existingData = await response.json();
        for (const item of existingData) {
            await fetch(`${API_URL}/${item.id}`, { method: "DELETE" });
        }
        // repopulate from scratch
        for (const expense of sampleExpenses) {
            await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(expense)
            });
        }
    } catch (error) {
        console.log("Database not ready yet, will retry...");
    }
}

function addExpense(){

let expense = {
amount: document.getElementById("amount").value,
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

})
.catch(error => {
    const loader = document.querySelector(".loading");
    if (loader) loader.remove();
    alert("Error saving expense: " + error.message);
});
}

// deletion helper
function deleteExpense(id){
    fetch(`${API_URL}/${id}`, {method:'DELETE'})
    .then(()=>loadExpenses());
}

function loadExpenses(){

fetch(API_URL)
.then(res => res.json())
.then(data => {

allExpenses = data; // Store for filtering

let list = document.getElementById("expenseList")
list.innerHTML = ""

let total = 0
let categoryCount = {}

data.forEach(exp => {

total += exp.amount

if(categoryCount[exp.category]){
categoryCount[exp.category] += exp.amount
}else{
categoryCount[exp.category] = exp.amount
}

list.innerHTML += `
<tr>
<td>₹${exp.amount}</td>
<td>${getEmoji(exp.category)} ${exp.category}</td>
<td>${exp.date}</td>
<td>${exp.description}</td>
<td>
    <button onclick="editExpense(${exp.id})" class="edit-btn" title="Edit">✏️</button>
    <button onclick="deleteExpense(${exp.id})" class="delete-btn" title="Delete">🗑️</button>
</td>
</tr>
`

})

// animate counters
animateValue("totalExpense", 0, total, 800, "₹");
animateValue("totalTransactions", 0, data.length, 800);

let top = Object.keys(categoryCount).reduce((a,b)=>categoryCount[a]>categoryCount[b]?a:b,"")
document.getElementById("topCategory").innerText = top || "-"

loadChart(data)

})

}

function loadChart(expenses){

if(chart){
chart.destroy()
}
if(pieChart){
pieChart.destroy()
}

const monthlyData = {}
const categoryData = {}

expenses.forEach(exp => {
    const month = new Date(exp.date).toLocaleString('default', { month: 'short' })
    monthlyData[month] = (monthlyData[month] || 0) + exp.amount
    categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amount
})

const labels = Object.keys(monthlyData)
const data = Object.values(monthlyData)

chart=new Chart(document.getElementById("expenseChart"),{
    type:"line",
    data:{
        labels:labels,
        datasets:[{
            label:"Monthly Expenses",
            data:data,
            backgroundColor:"rgba(255, 110, 196, 0.2)",
            borderColor:"#ff6ec4",
            borderWidth:3,
            fill:true,
            tension:0.4
        }]
    },
    options:{
        responsive:true,
        plugins:{
            title:{
                display:true,
                text:'Monthly Expense Trends',
                color:'white',
                font:{
                    size:16,
                    weight:'bold'
                }
            }
        },
        scales:{
            y:{
                beginAtZero:true,
                ticks:{
                    color:'white'
                }
            },
            x:{
                ticks:{
                    color:'white'
                }
            }
        }
    }
})

// pie chart for categories
const catLabels = Object.keys(categoryData)
const catValues = Object.values(categoryData)
const colors = [
    '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'
]

pieChart = new Chart(document.getElementById("categoryChart"),{
    type:'pie',
    data:{
        labels:catLabels,
        datasets:[{
            data:catValues,
            backgroundColor: colors.slice(0, catLabels.length)
        }]
    },
    options:{
        responsive:true,
        plugins:{
            title:{
                display:true,
                text:'Expense Categories',
                color:'white',
                font:{
                    size:16,
                    weight:'bold'
                }
            },
            legend:{
                labels:{
                    color:'white',
                    font:{
                        size:14
                    }
                },
                position:'bottom'
            }
        }
    }
})
}

async function initializeApp() {
    await populateSampleData();
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
}

// Filter by category
function filterByCategory() {
    const selectedCategory = document.getElementById("categoryFilter").value;
    
    let filteredExpenses = selectedCategory 
        ? allExpenses.filter(exp => exp.category === selectedCategory)
        : allExpenses;
    
    // Update display with filtered data
    let list = document.getElementById("expenseList");
    list.innerHTML = "";
    
    let total = 0;
    let categoryCount = {};
    
    filteredExpenses.forEach(exp => {
        total += exp.amount;
        
        if(categoryCount[exp.category]){
            categoryCount[exp.category] += exp.amount;
        } else {
            categoryCount[exp.category] = exp.amount;
        }
        
        list.innerHTML += `
        <tr>
        <td>₹${exp.amount}</td>
        <td>${getEmoji(exp.category)} ${exp.category}</td>
        <td>${exp.date}</td>
        <td>${exp.description}</td>
        <td>
            <button onclick="editExpense(${exp.id})" class="edit-btn" title="Edit">✏️</button>
            <button onclick="deleteExpense(${exp.id})" class="delete-btn" title="Delete">🗑️</button>
        </td>
        </tr>
        `;
    });
    
    // Update summary cards
    document.getElementById("totalExpense").innerText = `₹${total.toLocaleString()}`;
    document.getElementById("totalTransactions").innerText = filteredExpenses.length;
    
    let top = Object.keys(categoryCount).reduce((a,b) => categoryCount[a] > categoryCount[b] ? a : b, "");
    document.getElementById("topCategory").innerText = top || "-";
    
    // Update charts with filtered data
    loadChart(filteredExpenses);
    
    // Add to activity log
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const filterText = selectedCategory ? `Filtered by ${selectedCategory}` : "Showing all categories";
    document.getElementById("activityLog").innerHTML =
        `<li>${timeString}: ${filterText}</li>` + 
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
    document.body.removeChild(link);
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
    document.body.removeChild(link);
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
    const sortedMonths = Object.keys(monthlyData).sort().reverse();
    
    sortedMonths.forEach(monthKey => {
        const data = monthlyData[monthKey];
        const avgPerTransaction = (data.total / data.count).toFixed(2);
        
        // Find top category
        const topCategory = Object.keys(data.categories).reduce((a, b) => 
            data.categories[a] > data.categories[b] ? a : b
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

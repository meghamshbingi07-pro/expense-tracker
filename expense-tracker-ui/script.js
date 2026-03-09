const API_URL = "http://localhost:8080/expenses";

let chart;
let pieChart;

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

// Show loading
document.querySelector(".expense-form").innerHTML += '<div class="loading"></div>';

fetch(API_URL,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body: JSON.stringify(expense)
})
.then(res => res.json())
.then(data => {

// Hide loading
document.querySelector(".loading").remove();

// Add to activity log
const now = new Date();
const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
document.getElementById("activityLog").innerHTML =
`<li>${timeString}: Added ₹${expense.amount} for ${expense.category} - ${expense.description}</li>` + 
document.getElementById("activityLog").innerHTML;

// Animate container
document.querySelector(".main").animate(
[{transform:"scale(1)"},{transform:"scale(1.02)"},{transform:"scale(1)"}],
{duration:300}
)

loadExpenses()

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
<td><button onclick="deleteExpense(${exp.id})">🗑</button></td>
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

initializeApp()

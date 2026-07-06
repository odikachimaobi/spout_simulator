let chartInstance = null;
let currentDays = 30;
let currentPrices = {};
let currentLiqPrice = 0;

const ASSETS = {
  SPY:  { ltv: 0.80, category: "Broad ETF" },
  VOO:  { ltv: 0.80, category: "Broad ETF" },
  VTI:  { ltv: 0.80, category: "Broad ETF" },
  XLK:  { ltv: 0.75, category: "Sector ETF" },
  XLE:  { ltv: 0.70, category: "Sector ETF" },
  EEM:  { ltv: 0.68, category: "Intl ETF" },
  EWZ:  { ltv: 0.65, category: "Intl ETF" },
  AAPL: { ltv: 0.75, category: "Large-cap tech" },
  MSFT: { ltv: 0.75, category: "Large-cap tech" },
  GOOG: { ltv: 0.75, category: "Large-cap tech" },
  NVDA: { ltv: 0.75, category: "Large-cap tech" },
  NFLX: { ltv: 0.70, category: "Large-cap tech" },
  CRM:  { ltv: 0.70, category: "Large-cap tech" },
  AVGO: { ltv: 0.75, category: "Large-cap tech" },
  META: { ltv: 0.60, category: "High volatility" },
  TSLA: { ltv: 0.60, category: "High volatility" },
  V:    { ltv: 0.75, category: "Defensive" },
  WMT:  { ltv: 0.75, category: "Defensive" },
  TXN:  { ltv: 0.75, category: "Defensive" },
  JNJ:  { ltv: 0.75, category: "Defensive" },
  TGT:  { ltv: 0.70, category: "Defensive" },
  ABBV: { ltv: 0.75, category: "Defensive" },
  PFE:  { ltv: 0.70, category: "Defensive" },
  AMGN: { ltv: 0.75, category: "Defensive" },
  COP:  { ltv: 0.70, category: "Defensive" },
  ABT:  { ltv: 0.75, category: "Defensive" },
  BMY:  { ltv: 0.70, category: "Defensive" }
};

const symbolInput      = document.getElementById("symbol");
const symbolSearch     = document.getElementById("symbolSearch");
const dropdown         = document.getElementById("dropdown");
const selectedAsset    = document.getElementById("selectedAsset");
const selectedSymbol   = document.getElementById("selectedSymbol");
const selectedCategory = document.getElementById("selectedCategory");
const selectedLTV      = document.getElementById("selectedLTV");
const collateralInput  = document.getElementById("collateral");
const borrowedInput    = document.getElementById("borrowed");
const simulateBtn      = document.getElementById("simulateBtn");
const ltvDisplay       = document.getElementById("ltvDisplay");
const healthDisplay    = document.getElementById("healthDisplay");
const liqDisplay       = document.getElementById("liqDisplay");
const chartTitle       = document.getElementById("chartTitle");

symbolSearch.addEventListener("input", function() {
    const query = symbolSearch.value.trim().toUpperCase();
    dropdown.innerHTML = "";

    if (!query) {
        dropdown.classList.add("hidden");
        return;
    }

    const matches = Object.keys(ASSETS).filter(sym => sym.startsWith(query));

    if (matches.length === 0) {
        dropdown.classList.add("hidden");
        return;
    }

    matches.forEach(sym => {
        const item = document.createElement("div");
        item.classList.add("dropdown-item");
        item.innerHTML = `
            <div class="item-left">
                <span class="item-symbol">${sym}</span>
                <span class="item-category">${ASSETS[sym].category}</span>
            </div>
            <span class="item-ltv">LTV ${(ASSETS[sym].ltv * 100)}%</span>
        `;
        item.addEventListener("click", function() {
            selectAsset(sym);
        });
        dropdown.appendChild(item);
    });

    dropdown.classList.remove("hidden");
});

async function selectAsset(sym) {
    symbolInput.value            = sym;
    symbolSearch.value           = sym;
    selectedSymbol.textContent   = sym;
    selectedCategory.textContent = ASSETS[sym].category;
    selectedLTV.textContent      = "Max LTV " + (ASSETS[sym].ltv * 100) + "%";
    selectedAsset.classList.remove("hidden");
    dropdown.classList.add("hidden");

    const prices = await fetchPrices(sym);
    currentPrices = prices;
    chartTitle.textContent = `${sym} — ${currentDays} day price history`;
    renderChart(sym, prices, null);
}

document.addEventListener("click", function(e) {
    if (!symbolSearch.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add("hidden");
    }
});

document.querySelectorAll(".tf-btn").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        currentDays = parseInt(this.dataset.days);
        if (Object.keys(currentPrices).length > 0) {
            renderChart(symbolInput.value, currentPrices, currentLiqPrice || null);
        }
    });
});

function calculateLTV(borrowed, collateral) {
    return (borrowed / collateral) * 100;
}

function calculateHealthFactor(collateral, borrowed, threshold) {
    return (collateral * threshold) / borrowed;
}

async function fetchPrices(symbol) {
    try {
        const response = await fetch(`/stock/${symbol}`);
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("Failed to fetch prices:", err);
        return {};
    }
}

async function simulate() {
    const symbol     = symbolInput.value.trim().toUpperCase();
    const collateral = parseFloat(collateralInput.value);
    const borrowed   = parseFloat(borrowedInput.value);

    if (!symbol || isNaN(collateral) || isNaN(borrowed)) {
        alert("Please fill in all fields correctly.");
        return;
    }

    const asset = ASSETS[symbol];

    if (!asset) {
        alert(`${symbol} is not a supported Spout collateral asset.`);
        return;
    }

    const maxBorrowable = collateral * asset.ltv;
    if (borrowed > maxBorrowable) {
        alert(`Maximum borrowable for ${symbol} at ${asset.ltv * 100}% LTV is $${maxBorrowable.toFixed(2)}. Please reduce your borrowed amount.`);
        return;
    }

    const LIQUIDATION_THRESHOLD = asset.ltv;

    const prices = await fetchPrices(symbol);

    if (Object.keys(prices).length === 0) {
        alert("Could not fetch price data. Please try again.");
        return;
    }

    const sortedDates  = Object.keys(prices).sort();
    const currentPrice = prices[sortedDates[sortedDates.length - 1]];

    if (!currentPrice || isNaN(currentPrice)) {
        alert("Invalid price data received. Please try again.");
        return;
    }

    const numShares    = collateral / currentPrice;
    const liqPrice     = borrowed / (numShares * LIQUIDATION_THRESHOLD);
    const ltv          = calculateLTV(borrowed, collateral);
    const healthFactor = calculateHealthFactor(collateral, borrowed, LIQUIDATION_THRESHOLD);

    ltvDisplay.textContent    = ltv.toFixed(2) + "%";
    liqDisplay.textContent    = "$" + liqPrice.toFixed(2);
    healthDisplay.textContent = healthFactor.toFixed(2);
    document.getElementById("ltvMax").textContent = "Max " + (asset.ltv * 100) + "%";

    if (healthFactor >= 1.5) {
        healthDisplay.style.color = "#00D4A8";
    } else if (healthFactor >= 1.1) {
        healthDisplay.style.color = "#F59E0B";
    } else {
        healthDisplay.style.color = "#FF4560";
    }

    currentPrices   = prices;
    currentLiqPrice = liqPrice;
    renderChart(symbol, prices, liqPrice);
}

simulateBtn.addEventListener("click", simulate);

function renderChart(symbol, pricesObj, liquidationPrice) {
    if (!pricesObj || Object.keys(pricesObj).length === 0) return;

    const dates  = Object.keys(pricesObj).sort().slice(-currentDays);
    const prices = dates.map(date => pricesObj[date]);
    const datasets = [
        {
            label: `${symbol} Price`,
            data: prices,
            borderColor: "#3B82F6",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            fill: true,
            backgroundColor: "rgba(59,130,246,0.06)"
        }
    ];

    if (liquidationPrice && !isNaN(liquidationPrice)) {
        datasets.push({
            label: "Liquidation Price",
            data: dates.map(() => liquidationPrice),
            borderColor: "#FF4560",
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false
        });
    }

    chartTitle.textContent = `${symbol} — ${currentDays} day price history`;

    if (chartInstance) {
        chartInstance.destroy();
    }

    const ctx = document.getElementById("priceChart").getContext("2d");

    chartInstance = new Chart(ctx, {
        type: "line",
        data: { labels: dates, datasets },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { maxTicksLimit: 6, color: "#4A6FA5" },
                    grid: { color: "rgba(99,153,255,0.06)" }
                },
                y: {
                    ticks: {
                        color: "#4A6FA5",
                        callback: value => "$" + value
                    },
                    grid: { color: "rgba(99,153,255,0.06)" }
                }
            }
        }
    });
}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PriceSense AI - Indian Market Price Predictor</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="nav-container">
            <a href="#" class="logo">💰 PriceSense AI</a>
            <nav>
                <ul class="nav-links">
                    <li><a href="#home">Home</a></li>
                    <li><a href="#predict">Predict</a></li>
                    <li><a href="#about">How it Works</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <!-- Main Container -->
    <div class="main-container">
        <!-- Input Panel -->
        <div class="input-panel" id="inputSection">
            <h1 class="panel-title">AI Price Predictor</h1>
            <p class="panel-description">Enter detailed product specifications and get instant AI-powered market price predictions for the Indian market. Try examples like <span class="highlight">"iPhone 15 Pro 256GB used condition"</span> or <span class="highlight">"Dell XPS 13 laptop i7 16GB RAM"</span></p>
            
            <form class="input-form" id="inputForm">
                <textarea 
                    id="specsInput" 
                    class="specs-input"
                    placeholder="Enter product specifications here...&#10;&#10;Examples:&#10;• Samsung Galaxy S24 Ultra 512GB new&#10;• MacBook Air M2 8GB RAM used&#10;• Sony WH-1000XM4 headphones&#10;• OnePlus 12 256GB refurbished"
                ></textarea>
                <button type="submit" id="predictBtn" class="predict-btn">
                    <span>🔮 Predict Price</span>
                </button>
            </form>
        </div>

        <!-- Results Panel -->
        <div class="results-panel">
            <h2 class="results-title">Price Predictions</h2>
            <p class="results-subtitle">Real-time AI analysis of Indian market prices</p>
            
            <!-- Loading Section -->
            <div id="loadingSection" class="loading-section hidden">
                <div class="loading-text">
                    <div class="loading-spinner"></div>
                    <p>Analyzing market data...</p>
                </div>
            </div>

            <!-- Error Section -->
            <div id="errorSection" class="error-section hidden">
                <div class="error-icon">⚠️</div>
                <h3>Prediction Failed</h3>
                <p id="errorMessage">Something went wrong. Please try again.</p>
                <button class="retry-btn" onclick="document.getElementById('inputForm').dispatchEvent(new Event('submit'))">Try Again</button>
            </div>

            <!-- Results Container -->
            <div id="resultsSection" class="results-container">
                <!-- Empty State -->
                <div class="empty-state">
                    <div class="empty-state-icon">🔮</div>
                    <h3>No Predictions Yet</h3>
                    <p>Enter product details in the left panel to get started</p>
                </div>
            </div>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>

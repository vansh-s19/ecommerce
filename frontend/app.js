// ==============================
// Indian Market Price Predictor - Enhanced Frontend
// ==============================

class PricePredictor {
    constructor() {
        // DOM elements
        this.specsInput = document.getElementById('specsInput');
        this.predictBtn = document.getElementById('predictBtn');
        this.inputForm = document.getElementById('inputForm');
        this.inputSection = document.getElementById('inputSection');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.errorSection = document.getElementById('errorSection');
        this.retryBtn = document.querySelector('.retry-btn');

        this.loadingText = document.querySelector('#loadingSection .loading-text p');
        this.loadingMessages = [
            'Extracting specifications...',
            'Analyzing Indian market data...',
            'Consulting AI models...',
            'Comparing prices across platforms...',
            'Calculating price ranges...',
            'Finalizing predictions...'
        ];
        this.loadingInterval = null;

        // Store all predictions history
        this.predictions = [];

        this.init();
    }

    init() {
        // Event listeners
        this.inputForm.addEventListener('submit', this.handleSubmit.bind(this));
        this.retryBtn.addEventListener('click', this.hideError.bind(this));

        // Auto-resize textarea
        this.specsInput.addEventListener('input', this.autoResize.bind(this));

        // Add sample predictions on load (for demo)
        this.addSamplePredictions();
    }

    // --- Auto resize textarea ---
    autoResize() {
        this.specsInput.style.height = 'auto';
        this.specsInput.style.height = Math.max(120, this.specsInput.scrollHeight) + 'px';
    }

    // --- Main submission handler ---
    async handleSubmit(e) {
        e.preventDefault();
        const productSpecs = this.specsInput.value.trim();
        
        if (!productSpecs) {
            this.showError('⚠️ Please enter product specifications to get a price prediction.');
            return;
        }

        // Clear empty state
        this.clearEmptyState();

        this.showLoading();

        try {
            const result = await this.predictPrice(productSpecs);
            this.predictions.unshift(result); // Add to beginning
            this.addPredictionCard(result);
            this.specsInput.value = ''; // Clear input
            this.autoResize(); // Reset textarea size
        } catch (error) {
            console.error('Prediction error:', error);
            this.showError(error.message || 'Failed to predict price. Please check your internet connection and try again.');
        } finally {
            this.hideLoading();
        }
    }

    // --- API call to Netlify function ---
    async predictPrice(specs) {
        this.simulateLoadingSteps();

        const response = await fetch('/.netlify/functions/predict', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ specs })
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (parseError) {
                console.error('Failed to parse error response:', parseError);
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    }

    // --- Clear empty state ---
    clearEmptyState() {
        const emptyState = this.resultsSection.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
    }

    // --- Add single prediction card ---
    addPredictionCard(data) {
        const card = document.createElement('div');
        card.className = 'prediction-card';
        
        // Format the data
        const productName = data.product || data.productName || 'Unknown Product';
        const predictedPrice = data.predicted_price_inr || data.predictedPrice || 0;
        const rangeMin = data.range_inr?.min || data.rangeMin || 0;
        const rangeMax = data.range_inr?.max || data.rangeMax || 0;
        const confidence = Math.round((data.confidence || 0) * 100);
        const category = data.category || 'Unknown Category';
        const explanations = data.explanation_bullets || (data.explanation ? [data.explanation] : ['No explanation provided']);
        const anomalies = data.anomalies || [];

        card.innerHTML = `
            <div class="card-header">
                <h3>${this.escapeHtml(productName)}</h3>
                <small style="color: rgba(255,255,255,0.6); font-size: 0.85rem;">
                    ${new Date().toLocaleString('en-IN', { 
                        timeZone: 'Asia/Kolkata',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </small>
            </div>
            
            <div class="price-section">
                <div class="predicted-price">₹${this.formatPrice(predictedPrice)}</div>
                <div class="price-range">Range: ₹${this.formatPrice(rangeMin)} - ₹${this.formatPrice(rangeMax)}</div>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <strong>Category</strong>
                    <span>${this.escapeHtml(category)}</span>
                </div>
                <div class="info-item">
                    <strong>Confidence</strong>
                    <span style="color: ${confidence >= 80 ? '#4ecdc4' : confidence >= 60 ? '#ffb347' : '#ff6b6b'}">${confidence}%</span>
                </div>
                <div class="info-item">
                    <strong>Market</strong>
                    <span>Indian Market</span>
                </div>
                <div class="info-item">
                    <strong>Currency</strong>
                    <span>INR (₹)</span>
                </div>
            </div>
            
            <div class="explanation-box">
                <h4>Analysis</h4>
                <ul>
                    ${explanations.map(bullet => `<li>${this.escapeHtml(bullet)}</li>`).join('')}
                </ul>
            </div>
            
            ${anomalies.length > 0 ? `
                <div class="anomaly-box">
                    <h4>Potential Issues</h4>
                    <ul>
                        ${anomalies.map(anomaly => `<li>${this.escapeHtml(anomaly)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;

        // Insert at the beginning
        this.resultsSection.insertBefore(card, this.resultsSection.firstChild);
    }

    // --- Loading animation ---
    simulateLoadingSteps() {
        let step = 0;
        this.loadingText.textContent = this.loadingMessages[0];
        
        this.loadingInterval = setInterval(() => {
            step++;
            if (step < this.loadingMessages.length) {
                this.loadingText.textContent = this.loadingMessages[step];
            } else {
                clearInterval(this.loadingInterval);
                this.loadingInterval = null;
            }
        }, 800);
    }

    // --- Show loading state ---
    showLoading() {
        this.predictBtn.disabled = true;
        this.predictBtn.innerHTML = '<span>🔄 Predicting...</span>';
        this.loadingSection.classList.remove('hidden');
        this.errorSection.classList.add('hidden');
        
        // Scroll to loading section
        this.loadingSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    // --- Hide loading state ---
    hideLoading() {
        this.predictBtn.disabled = false;
        this.predictBtn.innerHTML = '<span>🔮 Predict Price</span>';
        this.loadingSection.classList.add('hidden');
        
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
    }

    // --- Show error ---
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.errorSection.classList.remove('hidden');
        this.loadingSection.classList.add('hidden');
        
        // Scroll to error section
        this.errorSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    // --- Hide error ---
    hideError() {
        this.errorSection.classList.add('hidden');
        // Focus back on input
        this.specsInput.focus();
    }

    // --- Add sample predictions for demo ---
    addSamplePredictions() {
        // Remove this method in production, it's just for demo
        const samplePredictions = [
            {
                product: "iPhone 15 Pro 256GB",
                predicted_price_inr: 119900,
                range_inr: { min: 115000, max: 125000 },
                confidence: 0.87,
                category: "Smartphones",
                explanation_bullets: [
                    "Based on current Apple India pricing and market trends",
                    "Analyzed prices from Amazon India, Flipkart, and Croma",
                    "Considered latest model availability and demand",
                    "Applied regional pricing adjustments for Indian market"
                ],
                anomalies: []
            }
        ];

        // Only add samples if no real predictions exist
        if (this.predictions.length === 0) {
            // Comment out or remove this in production
            // samplePredictions.forEach(prediction => this.addPredictionCard(prediction));
        }
    }

    // --- Utility functions ---
    formatPrice(price) {
        if (!price || isNaN(price)) return '0';
        return new Intl.NumberFormat('en-IN', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.round(price));
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // --- Get prediction history ---
    getPredictionHistory() {
        return this.predictions;
    }

    // --- Clear all predictions ---
    clearAllPredictions() {
        this.predictions = [];
        this.resultsSection.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔮</div>
                <h3>No Predictions Yet</h3>
                <p>Enter product details in the left panel to get started</p>
            </div>
        `;
    }

    // --- Export predictions (optional feature) ---
    exportPredictions() {
        if (this.predictions.length === 0) {
            alert('No predictions to export!');
            return;
        }

        const dataStr = JSON.stringify(this.predictions, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `price_predictions_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
}

// --- Initialize the application ---
document.addEventListener('DOMContentLoaded', () => {
    const predictor = new PricePredictor();
    
    // Make predictor globally accessible for debugging
    window.predictor = predictor;
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to submit
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            predictor.handleSubmit(new Event('submit'));
        }
        
        // Escape to hide error
        if (e.key === 'Escape') {
            predictor.hideError();
        }
    });
    
    // Add some helpful console messages
    console.log('🚀 PriceSense AI initialized!');
    console.log('💡 Tips:');
    console.log('   - Use Ctrl/Cmd + Enter to quickly submit');
    console.log('   - Use Escape to dismiss errors');
    console.log('   - Access predictor instance via window.predictor');
});

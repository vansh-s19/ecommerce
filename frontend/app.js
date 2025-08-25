// Indian Market Price Predictor - Frontend JavaScript
class PricePredictor {
    constructor() {
        // Corrected element IDs and class names to match your HTML
        this.specsInput = document.getElementById('specsInput');
        this.predictBtn = document.getElementById('predictBtn');
        this.inputSection = document.getElementById('inputSection');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.errorSection = document.getElementById('errorSection');
        this.retryBtn = document.querySelector('.retry-btn'); // Using class for retry button

        this.loadingText = document.querySelector('#loadingSection .loading-text p');
        this.loadingMessages = [
            'Extracting specifications...',
            'Analyzing market data...',
            'Consulting AI models...',
            'Calculating price ranges...',
            'Finalizing predictions...'
        ];
        this.loadingInterval = null;

        this.init();
    }

    init() {
        this.predictBtn.addEventListener('click', this.handleSubmit.bind(this));
        this.retryBtn.addEventListener('click', this.hideError.bind(this));
        
        // Initial setup to show only the input form
        this.showSection(this.inputSection);
    }

    showSection(section) {
        // Utility to show one section and hide all others
        const sections = [this.inputSection, this.loadingSection, this.resultsSection, this.errorSection];
        sections.forEach(sec => sec.classList.add('hidden'));
        section.classList.remove('hidden');
    }

    async handleSubmit(e) {
        e.preventDefault();
        const productSpecs = this.specsInput.value.trim();
        if (!productSpecs) {
            this.showError('Please enter product specifications to get a price prediction.');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideResults();

        try {
            const result = await this.predictPrice(productSpecs);
            this.showResults(result);
        } catch (error) {
            console.error('Prediction error:', error);
            this.showError(error.message || 'Failed to predict price. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async predictPrice(specs) {
        this.simulateLoadingSteps();

        const response = await fetch('/.netlify/functions/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ specs })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        return data;
    }

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

    showLoading() {
        this.predictBtn.disabled = true;
        this.predictBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Predicting...</span>';
        this.showSection(this.loadingSection);
    }

    hideLoading() {
        this.predictBtn.disabled = false;
        this.predictBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Predict Price</span>';
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
    }

    showResults(data) {
        // Corrected element IDs to match your HTML
        document.getElementById('predictedPrice').textContent = `₹${this.formatPrice(data.predicted_price_inr)}`;
        document.getElementById('priceRange').textContent =
            `Range: ₹${this.formatPrice(data.range_inr.min)} - ₹${this.formatPrice(data.range_inr.max)}`;

        const confidence = Math.round(data.confidence * 100);
        document.getElementById('confidenceFill').style.width = `${confidence}%`;
        document.getElementById('confidenceValue').textContent = `${confidence}%`;

        document.getElementById('productName').textContent = data.product || 'Unknown Product';
        document.getElementById('productCategory').textContent = data.category || 'Unknown';

        this.displayExplanation(data.explanation_bullets || []);
        this.displayAnomalies(data.anomalies || []);
        this.displaySpecs(data.specs_extracted || {});

        this.showSection(this.resultsSection);
        this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    displaySpecs(specs) {
        const specsContainer = document.querySelector('#resultsSection .specs-grid');
        specsContainer.innerHTML = '';

        if (Object.keys(specs).length === 0) {
            specsContainer.innerHTML = '<p class="spec-item">No detailed specifications available.</p>';
            return;
        }

        Object.entries(specs).forEach(([key, value]) => {
            const specItem = document.createElement('div');
            specItem.className = 'spec-item';
            specItem.innerHTML = `
                <div class="spec-key">${this.formatSpecKey(key)}</div>
                <div class="spec-value">${value}</div>
            `;
            specsContainer.appendChild(specItem);
        });
    }

    displayExplanation(bullets) {
        const explanationList = document.getElementById('explanationList');
        explanationList.innerHTML = '';

        if (bullets.length === 0) {
            explanationList.innerHTML = '<li>No explanation available.</li>';
            return;
        }

        bullets.forEach(bullet => {
            const li = document.createElement('li');
            li.textContent = bullet;
            explanationList.appendChild(li);
        });
    }

    displayAnomalies(anomalies) {
        const anomaliesSection = document.getElementById('anomaliesSection');
        const anomaliesList = document.getElementById('anomaliesList');

        if (anomalies.length === 0) {
            anomaliesSection.classList.add('hidden');
            anomaliesList.innerHTML = '';
            return;
        }

        anomaliesSection.classList.remove('hidden');
        anomaliesList.innerHTML = '';

        anomalies.forEach(anomaly => {
            const anomalyItem = document.createElement('div');
            anomalyItem.className = 'anomaly-item';
            anomalyItem.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>${anomaly}</span>
            `;
            anomaliesList.appendChild(anomalyItem);
        });
    }

    formatSpecKey(key) {
        return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    formatPrice(price) {
        if (!price) return '0';
        // Improved price formatting for Indian currency
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumSignificantDigits: 6
        }).format(price).replace('₹', '');
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.showSection(this.errorSection);
        this.errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    hideError() {
        this.showSection(this.inputSection);
    }

    hideResults() {
        this.resultsSection.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PricePredictor();

    // The cosmic cursor and scroll animations logic is fine, no changes needed here.
    // Cosmic cursor
    document.addEventListener('mousemove', (e) => {
        let cursor = document.querySelector('.cosmic-cursor');
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'cosmic-cursor';
            cursor.style.cssText = `
                position: fixed;
                width: 20px;
                height: 20px;
                background: radial-gradient(circle, rgba(99,102,241,0.8), transparent);
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                transition: transform 0.1s ease;
            `;
            document.body.appendChild(cursor);
        }
        cursor.style.left = e.clientX - 10 + 'px';
        cursor.style.top = e.clientY - 10 + 'px';
    });

    // Scroll animations
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('fade-in');
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.glass-card').forEach(card => observer.observe(card));
});

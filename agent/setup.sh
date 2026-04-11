#!/bin/bash
# Quick setup script for the monitoring agent

echo "🚀 Monitoring Agent Quick Setup"
echo "================================"

# Check Python version
python3_version=$(python3 --version 2>&1)
echo "✅ Found: $python3_version"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Create .env file
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env configuration..."
    cp .env.example .env
    echo "⚠️  Please edit .env to set your API_BASE_URL if needed"
else
    echo ""
    echo "✅ .env already exists"
fi

# Test imports
echo ""
echo "🧪 Testing imports..."
python3 -c "import config, logger, metrics, api_client; print('✅ All imports successful')" || {
    echo "❌ Import failed. Check requirements.txt"
    exit 1
}

# Test metrics collection
echo ""
echo "📊 Testing metrics collection..."
python3 -c "
from metrics import MetricsCollector
m = MetricsCollector()
data = m.collect_all()
print(f'✅ Successfully collected {len(data)} metrics')
" || {
    echo "❌ Metrics collection failed"
    exit 1
}

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Review .env file: nano .env"
echo "2. Run agent: python3 agent.py"
echo "3. For Linux service: see systemd_service.md"
echo ""
echo "For help: see README.md"

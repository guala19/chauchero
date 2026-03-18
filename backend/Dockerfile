FROM python:3.11-slim

WORKDIR /app

# gcc is required to compile psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching — only re-runs when requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run as non-root user (security best practice)
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

# Run Alembic migrations then start the server.
# This is intentional: migrations are idempotent and run before accepting traffic.
# For multi-instance deploys, consider a separate migration step in your CI/CD pipeline.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]

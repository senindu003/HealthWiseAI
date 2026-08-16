FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# Presidio loads this model during FastAPI startup for PII anonymisation.
RUN python -m spacy download en_core_web_sm

COPY app ./app

EXPOSE 8000

# Railway injects PORT. The shell form expands it when the container starts.
CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

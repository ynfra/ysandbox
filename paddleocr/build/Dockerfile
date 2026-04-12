FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgl1 libgomp1 libgthread-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir paddlepaddle paddleocr fastapi uvicorn[standard] python-multipart pillow

WORKDIR /app
COPY server.py .

EXPOSE 8866
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8866"]

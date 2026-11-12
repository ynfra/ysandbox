FROM python:3.13-alpine
RUN apk add --no-cache git
COPY sync.py /app/sync.py
ENV HOME=/tmp PYTHONUNBUFFERED=1
EXPOSE 8080
CMD ["python", "/app/sync.py"]

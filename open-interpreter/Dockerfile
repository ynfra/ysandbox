FROM python:3.11-slim

ENV HOST=0.0.0.0

RUN pip install --no-cache-dir "open-interpreter[server]"

EXPOSE 8000

ENTRYPOINT ["interpreter", "--server"]

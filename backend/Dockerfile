FROM python:3.12-slim
WORKDIR /app
ARG PIP_INDEX_URL=https://mirrors.cloud.tencent.com/pypi/simple
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 120 --retries 5 --index-url "$PIP_INDEX_URL" -r requirements.txt
COPY app app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

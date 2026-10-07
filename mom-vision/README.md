# mom-vision

MOM TV Stream Capture & OCR Pipeline

## Overview

24/7/365 Twitch stream capture with Azure AI Vision OCR and LLM Speech transcription.

## Architecture

- **OCR Worker**: Extracts text from stream every 5 seconds (Azure AI Vision Read API)
- **Audio Worker**: Continuous transcription (LLM Speech, Russian + English)
- **Storage**: Cosmos DB (fast queries) + Blob Storage (1080p highlights)
- **Cache**: Redis for real-time status

## Deployment

```bash
# Deploy infrastructure
az deployment sub create \
  --name fameshire-stream \
  --location eastus \
  --template-file infra/main.bicep \
  --parameters infra/environments/prod.bicepparam

# Build and push containers
az acr login --name fameshirestream
docker build -t fameshirestream.azurecr.io/ocr-worker:latest ./src/workers/ocr
docker push fameshirestream.azurecr.io/ocr-worker:latest
```

## Integration

MOM TV (momtv.fameshire.com) manages channel switching via API:
- `POST /api/capture/start` - Start capturing
- `POST /api/capture/switch` - Switch channel
- `GET /api/capture/status` - Current status

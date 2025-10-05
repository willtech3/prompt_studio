# Prompt Studio API - Bruno Collection

This is a Bruno collection for the Prompt Studio API. Bruno is an open-source API client alternative to Postman/Insomnia.

## Installation

1. Download Bruno from [https://www.usebruno.com/](https://www.usebruno.com/)
2. Open Bruno
3. Click "Open Collection"
4. Navigate to this `bruno-collection` folder
5. Select the folder and Bruno will load all requests

## Environment

The collection includes a `Local` environment with:
- `baseUrl`: http://localhost:8000

You can switch environments or create new ones in Bruno's environment settings.

## Collection Structure

### Health
- **Health Check** - Check API and database status

### Models
- **Get All Models** - List all available OpenRouter models
- **Get Model Info** - Get detailed info for a specific model
- **Refresh Model Catalog** - Refresh the model catalog from OpenRouter

### Chat
- **Stream Chat** - Stream a chat completion (SSE)

### Optimize
- **Optimize Prompt** - Use AI to optimize and improve prompts

### Saves
- **Create Save** - Save a prompt/state snapshot
- **List Saves** - List all saved snapshots
- **Get Save by ID** - Retrieve a specific save

## Quick Start

1. Make sure your backend server is running on http://localhost:8000
2. Start with the **Health Check** request to verify the API is working
3. Try **Get All Models** to see available models
4. Test **Stream Chat** to send a simple prompt
5. Use **Optimize Prompt** to improve a prompt
6. Create saves to store your work

## Notes

- The `Stream Chat` endpoint returns Server-Sent Events (SSE)
- Most POST endpoints require JSON body
- Database endpoints (saves) require DATABASE_URL to be configured
- OpenRouter endpoints require OPENROUTER_API_KEY environment variable

## Example Workflow

1. Get available models: `GET /api/models`
2. Stream a chat: `GET /api/chat/stream?model=openai/gpt-4o&prompt=Hello`
3. Optimize your prompt: `POST /api/optimize`
4. Save the optimized version: `POST /api/saves`
5. Retrieve it later: `GET /api/saves/{id}`

Enjoy testing the Prompt Studio API! 🚀

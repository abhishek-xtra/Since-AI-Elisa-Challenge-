# Elisa hidden-knowledge context layer

## Models used

Gemini on Google Cloud Vertex AI (location `global`, Application Default Credentials, no API key). All calls go through `llm.py` and are cached in `.llm_cache/`.

| Model ID | model_version (from the response) | Used for |
|---|---|---|
| `gemini-4-argon` | `gemini-4-argon` | extractor: reads Teams/email threads and returns the structured rule (EXTRACT_MODEL) |
| `gemini-3.5-flash` | `gemini-3.5-flash` | synthetic scenario threads from scripts, a different model on purpose (GENERATE_MODEL) |

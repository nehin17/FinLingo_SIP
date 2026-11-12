# Atlas MVP patch

This patch changes only Atlas's backend request handling and chat UI. It does not create tables or change database schema.

## Apply

1. Make a quick backup or commit your current working tree.
2. Copy the contents of the `backend/` and `frontend/` folders in this patch into the matching folders in your local FinLingo project, replacing those six files.
3. In `frontend/`, run:

   ```powershell
   npm install react-markdown remark-gfm
   ```

4. In `backend/src/main/resources/application.properties`, keep the existing Gemini properties and add:

   ```properties
   gemini.api.google-search-enabled=${GEMINI_GOOGLE_SEARCH_ENABLED:true}
   ```

5. Ensure `GEMINI_API_KEY` is set in the backend environment. Keep the existing model setting or set a supported model that has Google Search grounding enabled. The current default in this patch is `gemini-3.5-flash-lite`.
6. Restart backend and frontend.

## Test checklist

- Ask Atlas a basic finance question: `What is a P/E ratio?`
- Ask a current question: `What are the latest NVIDIA headlines?`
- Ask a follow-up: `Who is the CEO?` / `Why does that matter?`
- On Research page, ask: `Explain this company's P/E ratio.`
- On another page, ask: `How do I use the watchlist?`
- Confirm grounded answers show clickable sources when Gemini returns grounding metadata.
- Confirm an API failure shows a useful message instead of the generic "Could not reach Atlas".

## Scope / limitations

- Conversation context is held in the open chat component and sent with each request. It is not persisted to localStorage or PostgreSQL.
- Website guidance is based on the current route and the system instructions. Atlas is told not to invent UI features or button names. To make navigation instructions fully exact, add a route/feature map as FinLingo's navigation and UI are finalized.
- Google Search grounding is enabled by default and lets Gemini decide when a search is useful. It may add Google Search usage charges depending on model and billing.
- This patch does not give Atlas permission to click buttons or perform actions in the website; it explains how the user can do them.

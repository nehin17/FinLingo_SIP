package com.finlingo.backend.ai;

import com.finlingo.backend.ai.dto.ChatRequest.ChatTurn;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiService {
    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-3.5-flash-lite}")
    private String model;

    @Value("${gemini.api.google-search-enabled:true}")
    private boolean googleSearchEnabled;

    private final RestClient restClient = RestClient.builder().build();

    public Map<String, Object> generateAnswer(
            String ticker,
            String userQuestion,
            String companyDataContext,
            String pageContext,
            List<ChatTurn> history
    ) {
        if (geminiApiKey == null || geminiApiKey.isBlank()
                || geminiApiKey.equalsIgnoreCase("placeholder")) {
            throw new IllegalStateException(
                    "Atlas is not configured. Add a valid GEMINI_API_KEY to the backend environment."
            );
        }

        String systemInstruction = """
                You are Atlas, FinLingo's helpful, general-purpose assistant embedded throughout the FinLingo website.

                YOUR THREE JOBS
                1. WEBSITE GUIDE: Help users understand FinLingo, find features, navigate pages, and troubleshoot.
                   Use the supplied current-page context. Give short, numbered steps when explaining navigation.
                   Never invent a button, feature, route, or capability. If the exact UI detail is not in context,
                   say what you can establish and ask which page/screen they see.
                2. FINANCE ASSISTANT: Answer general questions about finance, investing, economics, markets,
                   financial statements, companies, and terminology. Do not restrict answers to FinLingo's database.
                3. CURRENT INFORMATION: Use Google Search grounding whenever current/recent facts, news,
                   events, prices, leadership, regulations, or other changing information would improve accuracy.
                   Clearly distinguish confirmed facts, reported allegations, opinions, and uncertainty.
                   Do not fabricate sources, dates, quotes, prices, or events.

                USING FINLINGO DATA
                - Treat supplied company data as additional context, not the only allowed source of knowledge.
                - Explicitly call it "FinLingo's stored data" and include its date when discussing stored market values.
                - If stored data conflicts with current grounded information, explain the difference and dates.
                - Never describe an old stored price as live/current.
                - If no company data is supplied, answer normally using your knowledge and Google Search when useful.

                PRESENTATION
                - Return clean Markdown: a useful short heading, concise paragraphs, bullets or numbered steps.
                - Use a Markdown table only when comparing several items or metrics.
                - Explain technical terms in plain language on first use.
                - Lead with the direct answer. Avoid filler, repetitive disclaimers, and unnecessarily long responses.
                - For navigation/how-to questions, use numbered steps.
                - For company/news questions, include dates and a brief source list when Google Search grounding provides sources.
                - If the user asks a simple question, keep the answer simple.

                CONVERSATION
                - Use previous turns to resolve follow-ups such as "it", "they", "that ratio", and "what happened next?"
                - The latest user message is the question to answer.
                - Ask one concise clarification only when essential.

                SAFETY AND TRUST
                - Provide educational information, not personalized guaranteed investment returns.
                - Explain material risks and uncertainty without being alarmist.
                - Do not claim to have taken an action in the website. Guide the user instead.
                """;

        String currentPrompt = """
                CURRENT FINLINGO CONTEXT
                Selected company/ticker: %s
                Current page/route: %s

                FINLINGO STORED COMPANY DATA (may be empty; use as supplementary context only):
                %s

                USER'S LATEST MESSAGE:
                %s
                """.formatted(
                safe(ticker, "None selected"),
                safe(pageContext, "Page not identified"),
                safe(companyDataContext, "No stored company data supplied."),
                userQuestion
        );

        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null) {
            history.stream()
                    .filter(turn -> turn != null && turn.getContent() != null
                            && !turn.getContent().isBlank())
                    .skip(Math.max(0, history.size() - 12))
                    .forEach(turn -> {
                        String role = "assistant".equalsIgnoreCase(turn.getRole())
                                || "model".equalsIgnoreCase(turn.getRole()) ? "model" : "user";
                        contents.add(Map.of(
                                "role", role,
                                "parts", List.of(Map.of("text", turn.getContent()))
                        ));
                    });
        }
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", currentPrompt))
        ));

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("systemInstruction",
                Map.of("parts", List.of(Map.of("text", systemInstruction))));
        requestBody.put("contents", contents);
        if (googleSearchEnabled) {
            requestBody.put("tools", List.of(Map.of("google_search", Map.of())));
        }

        try {
            Map<?, ?> response = restClient.post()
                    .uri("https://generativelanguage.googleapis.com/v1beta/models/"
                            + model + ":generateContent")
                    .header("x-goog-api-key", geminiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                throw new IllegalStateException("Gemini returned an empty response.");
            }

            Object candidatesObject = response.get("candidates");
            if (!(candidatesObject instanceof List<?> candidates) || candidates.isEmpty()) {
                throw new IllegalStateException(
                        "Gemini did not return an answer. Check the model/API configuration and try again."
                );
            }

            Object contentObject = ((Map<?, ?>) candidates.get(0)).get("content");
            if (!(contentObject instanceof Map<?, ?> content)
                    || !(content.get("parts") instanceof List<?> parts)) {
                throw new IllegalStateException("Gemini returned an unexpected response format.");
            }

            StringBuilder answer = new StringBuilder();
            for (Object item : parts) {
                if (item instanceof Map<?, ?> part && part.get("text") instanceof String text) {
                    answer.append(text);
                }
            }
            if (answer.isEmpty()) {
                throw new IllegalStateException("Gemini returned no text. Please rephrase your question.");
            }

            List<Map<String, String>> sources = extractSources(candidates.get(0));
            return Map.of("response", answer.toString().trim(), "sources", sources);

        } catch (RestClientResponseException e) {
            System.err.println("Gemini API HTTP " + e.getStatusCode() + ": " + e.getResponseBodyAsString());
            throw new IllegalStateException(
                    "Gemini API request failed (HTTP " + e.getStatusCode()
                            + "). Check the API key, model name, and Google Search grounding access."
            );
        }
    }

    private List<Map<String, String>> extractSources(Object candidateObject) {
        List<Map<String, String>> sources = new ArrayList<>();
        if (!(candidateObject instanceof Map<?, ?> candidate)) return sources;
        Object metadataObject = candidate.get("groundingMetadata");
        if (!(metadataObject instanceof Map<?, ?> metadata)) return sources;
        Object chunksObject = metadata.get("groundingChunks");
        if (!(chunksObject instanceof List<?> chunks)) return sources;

        for (Object chunkObject : chunks) {
            if (!(chunkObject instanceof Map<?, ?> chunk)) continue;
            Object webObject = chunk.get("web");
            if (!(webObject instanceof Map<?, ?> web)) continue;
            String uri = web.get("uri") instanceof String s ? s : null;
            String title = web.get("title") instanceof String s ? s : uri;
            if (uri != null && (uri.startsWith("https://") || uri.startsWith("http://"))) {
                boolean duplicate = sources.stream().anyMatch(s -> uri.equals(s.get("url")));
                if (!duplicate) sources.add(Map.of("title", safe(title, uri), "url", uri));
            }
        }
        return sources;
    }

    private String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}

package com.finlingo.backend.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
public class AiService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-3.5-flash-lite}")
    private String model;

    private final RestClient restClient = RestClient.builder().build();

    public String generateAnswer(
            String ticker,
            String userQuestion,
            String companyDataContext
    ) {
        if (geminiApiKey == null || geminiApiKey.isBlank()
                || geminiApiKey.equalsIgnoreCase("placeholder")) {
            return "FinLingo AI is not configured yet. Please add a valid Gemini API key.";
        }

        if (userQuestion == null || userQuestion.isBlank()) {
            return "Please enter a question.";
        }

        String systemInstruction = """
                You are FinLingo AI, a helpful financial education and research assistant.

                Rules:
                1. Explain financial concepts clearly and concisely.
                2. You may answer general educational questions using your knowledge.
                3. For company-specific or current market claims, use only the supplied company data.
                4. Never invent stock prices, financial metrics, company news, or market events.
                5. If company data is missing, say so clearly.
                6. Distinguish facts from estimates and explanations.
                7. Do not present responses as guaranteed investment advice.
                8. Use simple language suitable for students learning finance.
                9. When useful, explain important terms and risks.
                """;

        String prompt = """
                Selected ticker: %s

                Available company data:
                %s

                User question:
                %s
                """.formatted(
                ticker == null ? "None" : ticker,
                companyDataContext == null ? "No company data available." : companyDataContext,
                userQuestion
        );

        Map<String, Object> requestBody = Map.of(
                "systemInstruction",
                Map.of("parts", List.of(Map.of("text", systemInstruction))),
                "contents",
                List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt))
                ))
        );

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
                return "FinLingo AI received an empty response. Please try again.";
            }

            Object candidatesObject = response.get("candidates");

            if (!(candidatesObject instanceof List<?> candidates)
                    || candidates.isEmpty()) {
                return "FinLingo AI couldn't generate an answer. Please try rephrasing your question.";
            }

            Object contentObject = ((Map<?, ?>) candidates.get(0)).get("content");

            if (!(contentObject instanceof Map<?, ?> content)) {
                return "FinLingo AI returned an unexpected response. Please try again.";
            }

            Object partsObject = content.get("parts");

            if (!(partsObject instanceof List<?> parts)) {
                return "FinLingo AI couldn't find an answer. Please try again.";
            }

            StringBuilder answer = new StringBuilder();

            for (Object partObject : parts) {
                if (partObject instanceof Map<?, ?> part
                        && part.get("text") instanceof String text) {
                    answer.append(text);
                }
            }

            if (answer.isEmpty()) {
                return "FinLingo AI couldn't generate a text response. Please try again.";
            }

            return answer.toString().trim();

        } catch (RestClientResponseException e) {
            System.err.println("Gemini API error: HTTP " + e.getStatusCode());
            return "FinLingo AI is temporarily unavailable. Please check the API configuration and try again.";

        } catch (Exception e) {
            System.err.println("Gemini connection error: " + e.getMessage());
            return "Unable to connect to FinLingo AI right now. Please try again.";
        }
    }
}
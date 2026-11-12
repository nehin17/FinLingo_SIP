package com.finlingo.backend.ai.dto;

import java.util.ArrayList;
import java.util.List;

public class ChatRequest {
    private String message;
    private String ticker;
    private String pageContext;
    private List<ChatTurn> history = new ArrayList<>();

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }
    public String getPageContext() { return pageContext; }
    public void setPageContext(String pageContext) { this.pageContext = pageContext; }
    public List<ChatTurn> getHistory() { return history; }
    public void setHistory(List<ChatTurn> history) { this.history = history; }

    public static class ChatTurn {
        private String role;
        private String content;

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}

package com.finlingo.backend.learning;

import com.finlingo.backend.user.User;
import com.finlingo.backend.auth.JwtUtil;
import com.finlingo.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.DateTimeException;
import java.util.*;

@RestController
@RequestMapping("/api/learn")
public class LearningController {
    private final UserRepository users;
    private final LearningProgressRepository progress;
    private final LearningAttemptRepository attempts;
    private final LearningNoteRepository notes;
    private final JwtUtil jwt;

    private static final Map<String, Integer> PATH_SIZES = Map.of(
        "valuation-fundamentals", 8,
        "financial-statements", 12,
        "cash-flow-mastery", 6,
        "moats-competitive-advantage", 5
    );
    private static final Map<String, Integer> ANSWER_KEYS = Map.of(
        "pe", 1,
        "free-cash-flow", 2,
        "roe", 0,
        "balance-sheet", 1,
        "gross-margin", 2,
        "case-nvda-vs-aapl", 1,
        "case-apple-vs-microsoft-roe", 0,
        "case-amazon-cash-flow-paradox", 1,
        "case-tesla-growth-sustainability", 2
    );

    public LearningController(UserRepository users, LearningProgressRepository progress,
                              LearningAttemptRepository attempts, LearningNoteRepository notes,
                              JwtUtil jwt) {
        this.users = users;
        this.progress = progress;
        this.attempts = attempts;
        this.notes = notes;
        this.jwt = jwt;
    }

    // Validate the same bearer token issued by /api/auth/login. These routes
    // never accept a user ID or email supplied by the browser for ownership.
    private User currentUser(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to save learning progress");
        }
        String token = authorization.substring(7).trim();
        if (!jwt.isTokenValid(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Your sign-in session has expired");
        }
        String email = jwt.extractEmail(token);
        return users.findByEmail(email).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable"));
    }

    private void requireLesson(String lessonId) {
        if (lessonId == null || !lessonId.matches("[a-z-]+-[0-9]{2}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown lesson");
        }
        int end = lessonId.lastIndexOf('-');
        Integer size = PATH_SIZES.get(lessonId.substring(0, end));
        int number = Integer.parseInt(lessonId.substring(end + 1));
        if (size == null || number < 1 || number > size) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown lesson");
        }
    }

    // A streak day is earned by completing a lesson OR submitting a practice
    // question (including a wrong answer). Visiting the site does not count.
    // Both events are already timestamped and attached to the signed-in user.
    public record StreakResponse(int currentStreak, int bestStreak,
                                 LocalDate lastActiveDate, boolean todayCompleted) {}

    private ZoneId requestedZone(String timeZone) {
        if (timeZone == null || timeZone.isBlank()) return ZoneId.systemDefault();
        try {
            return ZoneId.of(timeZone);
        } catch (DateTimeException invalid) {
            return ZoneId.systemDefault();
        }
    }

    private LocalDate activityDate(LocalDateTime dateTime, ZoneId userZone) {
        // Existing entity timestamps are local server times, not UTC instants.
        return dateTime.atZone(ZoneId.systemDefault())
            .withZoneSameInstant(userZone).toLocalDate();
    }

    private StreakResponse calculateStreak(List<LearningProgress> completions,
                                           List<LearningAttempt> quizzes, ZoneId userZone) {
        NavigableSet<LocalDate> days = new TreeSet<>();
        completions.forEach(record -> days.add(activityDate(record.getCompletedAt(), userZone)));
        quizzes.forEach(record -> days.add(activityDate(record.getAttemptedAt(), userZone)));

        LocalDate today = LocalDate.now(userZone);
        if (days.isEmpty()) return new StreakResponse(0, 0, null, false);

        // A streak remains intact until the end of the day after the last activity.
        // If neither today nor yesterday has an event, the current streak is zero.
        LocalDate cursor = days.contains(today) ? today : today.minusDays(1);
        int current = 0;
        while (days.contains(cursor)) {
            current++;
            cursor = cursor.minusDays(1);
        }

        int best = 0;
        int run = 0;
        LocalDate previous = null;
        for (LocalDate day : days) {
            run = previous != null && day.equals(previous.plusDays(1)) ? run + 1 : 1;
            best = Math.max(best, run);
            previous = day;
        }
        return new StreakResponse(current, best, days.last(), days.contains(today));
    }

    @GetMapping("/streak")
    @Transactional(readOnly = true)
    public StreakResponse getStreak(@RequestHeader(value = "Authorization", required = false) String auth,
                                    @RequestHeader(value = "X-Timezone", required = false) String timeZone) {
        User user = currentUser(auth);
        return calculateStreak(
            progress.findByUser_IdOrderByCompletedAtAsc(user.getId()),
            attempts.findByUser_Id(user.getId()),
            requestedZone(timeZone));
    }

    public record ProgressResponse(List<String> completedLessonIds, int streakDays,
                                   int challengeAttempts, int challengeCorrect) {}

    @GetMapping("/progress")
    @Transactional(readOnly = true)
    public ProgressResponse getProgress(@RequestHeader(value = "Authorization", required = false) String auth,
                                         @RequestHeader(value = "X-Timezone", required = false) String timeZone) {
        User user = currentUser(auth);
        List<LearningProgress> completions = progress.findByUser_IdOrderByCompletedAtAsc(user.getId());
        List<LearningAttempt> quizzes = attempts.findByUser_Id(user.getId());
        int correct = (int) quizzes.stream().filter(LearningAttempt::isCorrect).count();
        int streak = calculateStreak(completions, quizzes, requestedZone(timeZone)).currentStreak();
        return new ProgressResponse(completions.stream().map(LearningProgress::getLessonId).toList(),
            streak, quizzes.size(), correct);
    }

    @PostMapping("/progress/{lessonId}")
    @Transactional
    public ProgressResponse complete(@PathVariable String lessonId,
                                     @RequestHeader(value = "Authorization", required = false) String auth,
                                     @RequestHeader(value = "X-Timezone", required = false) String timeZone) {
        requireLesson(lessonId);
        User user = currentUser(auth);
        if (progress.findByUser_IdAndLessonId(user.getId(), lessonId).isEmpty()) {
            progress.save(new LearningProgress(user, lessonId));
        }
        return getProgress(auth, timeZone);
    }

    @DeleteMapping("/progress/{lessonId}")
    @Transactional
    public ProgressResponse uncomplete(@PathVariable String lessonId,
                                       @RequestHeader(value = "Authorization", required = false) String auth,
                                       @RequestHeader(value = "X-Timezone", required = false) String timeZone) {
        requireLesson(lessonId);
        User user = currentUser(auth);
        progress.findByUser_IdAndLessonId(user.getId(), lessonId).ifPresent(progress::delete);
        return getProgress(auth, timeZone);
    }

    private void requireResourceId(String resourceId) {
        if (resourceId == null || !resourceId.matches("(lesson|case)-[a-z0-9-]{2,120}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown learning resource");
        }
    }

    public record NoteRequest(String text) {}
    public record NoteResponse(String text, LocalDateTime updatedAt) {}

    @GetMapping("/notes/{resourceId}")
    @Transactional(readOnly = true)
    public NoteResponse getNote(@PathVariable String resourceId,
                                @RequestHeader(value = "Authorization", required = false) String auth) {
        requireResourceId(resourceId);
        User user = currentUser(auth);
        return notes.findByUser_IdAndResourceId(user.getId(), resourceId)
            .map(note -> new NoteResponse(note.getBody(), note.getUpdatedAt()))
            .orElse(new NoteResponse("", null));
    }

    @PutMapping("/notes/{resourceId}")
    @Transactional
    public NoteResponse saveNote(@PathVariable String resourceId, @RequestBody NoteRequest request,
                                 @RequestHeader(value = "Authorization", required = false) String auth) {
        requireResourceId(resourceId);
        User user = currentUser(auth);
        String body = request == null ? null : request.text();
        if (body == null || body.length() > 20_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notes must be under 20,000 characters");
        }
        LearningNote note = notes.findByUser_IdAndResourceId(user.getId(), resourceId)
            .orElseGet(() -> new LearningNote(user, resourceId));
        note.setBody(body);
        note = notes.save(note);
        return new NoteResponse(note.getBody(), note.getUpdatedAt());
    }

    public record AnswerRequest(String questionId, Integer selectedIndex) {}
    public record AnswerResponse(boolean correct, int correctIndex) {}

    @PostMapping("/challenges/attempt")
    @Transactional
    public AnswerResponse submitAnswer(@RequestBody AnswerRequest request,
                                        @RequestHeader(value = "Authorization", required = false) String auth) {
        User user = currentUser(auth);
        Integer answer = request == null ? null : ANSWER_KEYS.get(request.questionId());
        Integer selected = request == null ? null : request.selectedIndex();
        if (answer == null || selected == null || selected < 0 || selected > 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid question or answer");
        }
        boolean correct = Objects.equals(answer, selected);
        attempts.save(new LearningAttempt(user, request.questionId(), selected, correct));
        return new AnswerResponse(correct, answer);
    }
}

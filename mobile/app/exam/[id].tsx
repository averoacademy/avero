import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/constants/theme";
import {
  Clock,
  Flag,
  Grid,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  X,
} from "@/components/Icons";

export default function ExamRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    mode?: string;
    paperType?: string;
    count?: string;
    timeLimit?: string;
  }>();

  const isSimulator = params.id === "simulator";
  const examMode = params.mode || (isSimulator ? "Exam" : "Practice");

  const [examTitle, setExamTitle] = useState("Nursing Examination");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [flaggedIndices, setFlaggedIndices] = useState<Set<number>>(new Set());

  const [timeLeftSeconds, setTimeLeftSeconds] = useState(60 * 60);
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(60 * 60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [gridVisible, setGridVisible] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Timer interval ref
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadExamData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadExamData = async () => {
    setLoading(true);
    try {
      if (isSimulator) {
        const query = new URLSearchParams({
          paperType: params.paperType || "Paper1",
          count: params.count || "50",
          timeLimit: params.timeLimit || "60",
        });
        const res = await api.get<any>(`/api/user/mock-exam/generate?${query.toString()}`);
        if (res?.questions) {
          setQuestions(res.questions);
          setExamTitle(res.paperTitle || "Council Mock Simulation");
          const limitSeconds = (res.timeLimitMinutes || 60) * 60;
          setTimeLeftSeconds(limitSeconds);
          setTotalTimeSeconds(limitSeconds);
        }
      } else {
        const res = await api.get<any>(`/api/user/courses/${params.id}`);
        if (res?.course?.questions) {
          setQuestions(res.course.questions);
          setExamTitle(res.course.title || "Course Practice");
          const limitSeconds = (res.course.timeLimitMinutes || 45) * 60;
          setTimeLeftSeconds(limitSeconds);
          setTotalTimeSeconds(limitSeconds);
        }
      }
    } catch (e: any) {
      Alert.alert("Failed to Load Exam", e?.message || "Could not retrieve questions.", [
        { text: "Go Back", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (loading || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, questions.length]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: option,
    }));
  };

  const toggleFlag = () => {
    setFlaggedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  const handleAutoSubmit = () => {
    Alert.alert("Time Expired", "Your examination time has ended. Submitting your answers now...", [
      { text: "OK", onPress: () => submitExam() },
    ]);
  };

  const confirmSubmit = () => {
    const answeredCount = Object.keys(selectedAnswers).length;
    const unansweredCount = questions.length - answeredCount;

    let message = `You have answered ${answeredCount} of ${questions.length} questions.`;
    if (unansweredCount > 0) {
      message += ` You still have ${unansweredCount} unanswered questions!`;
    }

    Alert.alert("Submit Examination?", message, [
      { text: "Continue Testing", style: "cancel" },
      { text: "Submit Now", style: "destructive", onPress: submitExam },
    ]);
  };

  const submitExam = async () => {
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = totalTimeSeconds - timeLeftSeconds;

    const formattedAnswers = questions.map((q, idx) => {
      const selected = selectedAnswers[idx] || "";
      const isCorrect = selected.trim().toLowerCase() === (q.correctAnswer || "").trim().toLowerCase();
      return {
        questionId: q._id ? q._id.toString() : "",
        questionIndex: idx,
        question: q.question,
        questionText: q.question,
        options: q.options,
        selectedOption: selected,
        userChoice: selected,
        correctAnswer: q.correctAnswer,
        correctChoice: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || "",
        courseId: q.courseId || params.id,
        courseTitle: q.courseTitle || examTitle,
      };
    });

    try {
      let res: any;
      if (isSimulator) {
        res = await api.post("/api/user/mock-exam/submit", {
          paperTitle: examTitle,
          answers: formattedAnswers,
          timeTakenSeconds: timeTaken,
        });
      } else {
        const correctCount = formattedAnswers.filter((a) => a.isCorrect).length;
        const score = Math.round((correctCount / questions.length) * 100);
        res = await api.post("/api/user/attempts", {
          courseId: params.id,
          mode: examMode,
          answers: formattedAnswers,
          score,
          timeTakenSeconds: timeTaken,
        });
      }

      const attemptId = res?.attemptId || res?.attempt?._id;
      if (attemptId) {
        router.replace(`/exam/result/${attemptId}`);
      } else {
        router.replace("/(tabs)/mock-exam");
      }
    } catch (e: any) {
      Alert.alert("Submission Error", e?.message || "Failed to submit exam.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    Alert.alert(
      "Abandon Examination?",
      "Are you sure you want to leave? Your active progress will not be saved.",
      [
        { text: "Keep Testing", style: "cancel" },
        { text: "Exit Exam", style: "destructive", onPress: () => router.back() },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Preparing CBT Examination Room...</Text>
      </View>
    );
  }

  const currentQ = questions[currentIndex];
  const isFlagged = flaggedIndices.has(currentIndex);
  const currentAnswer = selectedAnswers[currentIndex];
  const timerCritical = timeLeftSeconds < 300; // < 5 mins

  return (
    <View style={styles.container}>
      {/* Top CBT Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleExit} style={styles.exitBtn}>
          <X size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text style={styles.examTitle} numberOfLines={1}>
            {examTitle}
          </Text>
          <Text style={styles.modeSub}>{examMode} Mode</Text>
        </View>

        {/* Live Timer */}
        <View style={[styles.timerBadge, timerCritical && styles.timerBadgeAlert]}>
          <Clock size={15} color={timerCritical ? Colors.danger : Colors.primary} />
          <Text style={[styles.timerText, timerCritical && styles.timerTextAlert]}>
            {formatTimer(timeLeftSeconds)}
          </Text>
        </View>
      </View>

      {/* Secondary Controls Bar */}
      <View style={styles.controlsBar}>
        <Text style={styles.questionCounter}>
          Question <Text style={styles.activeQNumber}>{currentIndex + 1}</Text> of{" "}
          {questions.length}
        </Text>

        <View style={styles.controlActions}>
          <TouchableOpacity
            style={[styles.flagBtn, isFlagged && styles.flagBtnActive]}
            onPress={toggleFlag}
          >
            <Flag
              size={15}
              color={isFlagged ? "#F59E0B" : Colors.textMuted}
              fill={isFlagged ? "#F59E0B" : "transparent"}
            />
            <Text style={[styles.flagText, isFlagged && styles.flagTextActive]}>
              {isFlagged ? "Flagged" : "Flag"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => setGridVisible(true)}
          >
            <Grid size={16} color={Colors.primary} />
            <Text style={styles.gridBtnText}>Grid</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Question & Options Content */}
      <ScrollView
        style={styles.questionScroll}
        contentContainerStyle={styles.questionContent}
      >
        <Text style={styles.questionText}>{currentQ?.question}</Text>

        {/* Options */}
        <View style={styles.optionsList}>
          {currentQ?.options?.map((optionText: string, oIndex: number) => {
            const letter = String.fromCharCode(65 + oIndex); // A, B, C, D
            const isSelected = currentAnswer === optionText;

            return (
              <TouchableOpacity
                key={oIndex}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                onPress={() => handleSelectOption(optionText)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.optionLetterBadge,
                    isSelected && styles.optionLetterBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLetterText,
                      isSelected && styles.optionLetterTextSelected,
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {optionText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Practice Mode Explanation Toggle */}
        {examMode === "Practice" && (
          <View style={styles.practiceExpContainer}>
            <TouchableOpacity
              style={styles.revealBtn}
              onPress={() => setShowExplanation(!showExplanation)}
            >
              <Text style={styles.revealBtnText}>
                {showExplanation ? "Hide Explanation" : "Reveal Explanation & Answer"}
              </Text>
            </TouchableOpacity>

            {showExplanation && (
              <View style={styles.expBox}>
                <Text style={styles.expAnswerLabel}>
                  CORRECT: {currentQ?.correctAnswer}
                </Text>
                <Text style={styles.expText}>{currentQ?.explanation}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Toolbar */}
      <View style={styles.bottomToolbar}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          disabled={currentIndex === 0}
          onPress={() => {
            setShowExplanation(false);
            setCurrentIndex((prev) => prev - 1);
          }}
        >
          <ChevronLeft size={18} color={currentIndex === 0 ? Colors.textMuted : Colors.textPrimary} />
          <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
            Prev
          </Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity
            style={styles.submitExamBtn}
            onPress={confirmSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.submitExamBtnText}>Submit Exam</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => {
              setShowExplanation(false);
              setCurrentIndex((prev) => prev + 1);
            }}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <ChevronRight size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        )}
      </View>

      {/* Question Grid Modal */}
      <Modal
        visible={gridVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setGridVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Question Navigator</Text>
              <TouchableOpacity onPress={() => setGridVisible(false)}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
                <Text style={styles.legendText}>Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.legendText}>Flagged</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.surfaceLight }]} />
                <Text style={styles.legendText}>Unanswered</Text>
              </View>
            </View>

            {/* 1..N Question Grid */}
            <ScrollView contentContainerStyle={styles.gridMatrix}>
              {questions.map((_, qIdx) => {
                const isAns = selectedAnswers[qIdx] !== undefined;
                const isFlg = flaggedIndices.has(qIdx);
                const isCur = currentIndex === qIdx;

                let cellBg = Colors.surfaceLight;
                if (isCur) cellBg = Colors.primaryMuted;
                else if (isFlg) cellBg = "rgba(245, 158, 11, 0.25)";
                else if (isAns) cellBg = "rgba(16, 185, 129, 0.25)";

                let cellBorder = Colors.surfaceBorder;
                if (isCur) cellBorder = Colors.primary;
                else if (isFlg) cellBorder = "#F59E0B";
                else if (isAns) cellBorder = Colors.accent;

                return (
                  <TouchableOpacity
                    key={qIdx}
                    style={[
                      styles.gridCell,
                      { backgroundColor: cellBg, borderColor: cellBorder },
                    ]}
                    onPress={() => {
                      setCurrentIndex(qIdx);
                      setShowExplanation(false);
                      setGridVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.gridCellText,
                        isCur && { color: Colors.primary, fontWeight: "800" },
                      ]}
                    >
                      {qIdx + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={() => {
                setGridVisible(false);
                confirmSubmit();
              }}
            >
              <Text style={styles.modalSubmitText}>Submit Exam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.backgroundSecondary,
  },
  exitBtn: {
    padding: 6,
  },
  titleWrapper: {
    flex: 1,
    paddingHorizontal: 10,
  },
  examTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  modeSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 6,
  },
  timerBadgeAlert: {
    backgroundColor: Colors.dangerMuted,
    borderColor: Colors.danger,
  },
  timerText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  timerTextAlert: {
    color: Colors.danger,
  },
  controlsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  questionCounter: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  activeQNumber: {
    color: Colors.primary,
    fontWeight: "800",
  },
  controlActions: {
    flexDirection: "row",
    gap: 8,
  },
  flagBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  flagBtnActive: {
    backgroundColor: Colors.warningMuted,
  },
  flagText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  flagTextActive: {
    color: "#F59E0B",
  },
  gridBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  gridBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
  },
  questionScroll: {
    flex: 1,
  },
  questionContent: {
    padding: 20,
    paddingBottom: 40,
  },
  questionText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    padding: 14,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#EEF4FF",
  },
  optionLetterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionLetterBadgeSelected: {
    backgroundColor: Colors.primary,
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  optionLetterTextSelected: {
    color: Colors.textInverse,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  optionTextSelected: {
    fontWeight: "600",
  },
  practiceExpContainer: {
    marginTop: 24,
  },
  revealBtn: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  revealBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
  },
  expBox: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  expAnswerLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.accent,
    marginBottom: 4,
  },
  expText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  bottomToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  navBtnTextDisabled: {
    color: Colors.textMuted,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textInverse,
  },
  submitExamBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  submitExamBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textInverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  gridMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 20,
  },
  gridCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gridCellText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textInverse,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/constants/theme";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "@/components/Icons";

export default function ExamResultScreen() {
  const router = useRouter();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();

  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"all" | "incorrect" | "correct">("all");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadAttempt();
  }, [attemptId]);

  const loadAttempt = async () => {
    try {
      const res = await api.get<any>(`/api/user/attempts/${attemptId}`);
      if (res?.attempt) {
        setAttempt(res.attempt);
      }
    } catch (e) {
      console.warn("Failed to load attempt details:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Calculating Score & Subject Breakdown...</Text>
      </View>
    );
  }

  if (!attempt) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Exam result not found.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/(tabs)/home")}
        >
          <Text style={styles.backBtnText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const score = attempt.score || 0;
  const passed = attempt.passed || score >= 50;
  const totalQuestions = attempt.totalQuestions || attempt.answers?.length || 0;
  const correctCount = attempt.answers?.filter((a: any) => a.isCorrect).length || 0;
  const timeTaken = attempt.timeTakenSeconds || attempt.timeSpentSeconds || 0;

  const filteredAnswers = (attempt.answers || []).filter((a: any) => {
    if (filterMode === "incorrect") return !a.isCorrect;
    if (filterMode === "correct") return a.isCorrect;
    return true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.homeLink}
          onPress={() => router.replace("/(tabs)/home")}
        >
          <ArrowLeft size={18} color={Colors.textSecondary} />
          <Text style={styles.homeLinkText}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Examination Result</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Main Score Hero Card */}
      <View style={styles.scoreHeroCard}>
        <View
          style={[
            styles.statusPill,
            passed ? styles.statusPillPassed : styles.statusPillFailed,
          ]}
        >
          {passed ? (
            <CheckCircle2 size={16} color={Colors.accent} />
          ) : (
            <XCircle size={16} color={Colors.danger} />
          )}
          <Text
            style={[
              styles.statusText,
              passed ? styles.statusTextPassed : styles.statusTextFailed,
            ]}
          >
            {passed ? "COUNCIL BENCHMARK PASSED" : "NEEDS REMEDIATION"}
          </Text>
        </View>

        <Text style={styles.scoreNumber}>{score}%</Text>
        <Text style={styles.paperName}>
          {attempt.paperTitle || attempt.courseId?.title || "Nursing Council Exam"}
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>
              {correctCount} / {totalQuestions}
            </Text>
            <Text style={styles.statLbl}>Correct</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statVal}>{Math.round(timeTaken / 60)}m</Text>
            <Text style={styles.statLbl}>Time Spent</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statVal}>50%</Text>
            <Text style={styles.statLbl}>Pass Mark</Text>
          </View>
        </View>
      </View>

      {/* Subject Breakdown if Available */}
      {attempt.subjectBreakdown && attempt.subjectBreakdown.length > 0 && (
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionHeaderTitle}>Subject Breakdown</Text>
          {attempt.subjectBreakdown.map((sub: any, sIdx: number) => {
            const subScore = sub.totalQuestions > 0
              ? Math.round((sub.correctCount / sub.totalQuestions) * 100)
              : 0;
            return (
              <View key={sIdx} style={styles.subjectRow}>
                <View style={styles.subInfo}>
                  <Text style={styles.subTitle}>{sub.courseTitle}</Text>
                  <Text style={styles.subCounts}>
                    {sub.correctCount} of {sub.totalQuestions} correct
                  </Text>
                </View>
                <Text
                  style={[
                    styles.subScore,
                    subScore >= 50 ? { color: Colors.accent } : { color: Colors.danger },
                  ]}
                >
                  {subScore}%
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Review Answers Section */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.sectionHeaderTitle}>Question Review</Text>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterMode === "all" && styles.filterChipActive,
              ]}
              onPress={() => setFilterMode("all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterMode === "all" && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                filterMode === "incorrect" && styles.filterChipActive,
              ]}
              onPress={() => setFilterMode("incorrect")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterMode === "incorrect" && styles.filterChipTextActive,
                ]}
              >
                Incorrect
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                filterMode === "correct" && styles.filterChipActive,
              ]}
              onPress={() => setFilterMode("correct")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterMode === "correct" && styles.filterChipTextActive,
                ]}
              >
                Correct
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredAnswers.map((item: any, qIdx: number) => {
          const isExpanded = expandedIndex === qIdx;
          const isCorrect = item.isCorrect;

          return (
            <View key={qIdx} style={styles.qReviewCard}>
              <TouchableOpacity
                style={styles.qReviewHeader}
                activeOpacity={0.8}
                onPress={() => setExpandedIndex(isExpanded ? null : qIdx)}
              >
                <View style={styles.qReviewLeft}>
                  <View
                    style={[
                      styles.resultIcon,
                      isCorrect ? styles.resultIconCorrect : styles.resultIconIncorrect,
                    ]}
                  >
                    {isCorrect ? (
                      <CheckCircle2 size={16} color={Colors.accent} />
                    ) : (
                      <XCircle size={16} color={Colors.danger} />
                    )}
                  </View>
                  <Text style={styles.qReviewNumber}>
                    Q{item.questionIndex !== undefined ? item.questionIndex + 1 : qIdx + 1}
                  </Text>
                </View>

                {isExpanded ? (
                  <ChevronUp size={18} color={Colors.textMuted} />
                ) : (
                  <ChevronDown size={18} color={Colors.textMuted} />
                )}
              </TouchableOpacity>

              <Text style={styles.qReviewText}>
                {item.questionText || item.question}
              </Text>

              {/* Answers comparison */}
              <View style={styles.answerComparison}>
                <View style={styles.ansLine}>
                  <Text style={styles.ansLabel}>Your answer: </Text>
                  <Text
                    style={[
                      styles.ansVal,
                      isCorrect ? styles.textCorrect : styles.textIncorrect,
                    ]}
                  >
                    {item.userChoice || item.selectedOption || "No answer chosen"}
                  </Text>
                </View>

                {!isCorrect && (
                  <View style={styles.ansLine}>
                    <Text style={styles.ansLabel}>Correct: </Text>
                    <Text style={[styles.ansVal, styles.textCorrect]}>
                      {item.correctChoice || item.correctAnswer}
                    </Text>
                  </View>
                )}
              </View>

              {/* Expanded Rationale */}
              {isExpanded && item.explanation && (
                <View style={styles.rationaleBox}>
                  <Text style={styles.rationaleTitle}>CLINICAL RATIONALE</Text>
                  <Text style={styles.rationaleBody}>{item.explanation}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => router.replace("/(tabs)/mock-exam")}
        >
          <RefreshCw size={16} color={Colors.textInverse} />
          <Text style={styles.retakeBtnText}>Take Another Exam</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  homeLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  homeLinkText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  scoreHeroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  statusPillPassed: {
    backgroundColor: Colors.accentMuted,
  },
  statusPillFailed: {
    backgroundColor: Colors.dangerMuted,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusTextPassed: {
    color: Colors.accent,
  },
  statusTextFailed: {
    color: Colors.danger,
  },
  scoreNumber: {
    fontSize: 54,
    fontWeight: "900",
    color: Colors.textPrimary,
    lineHeight: 60,
  },
  paperName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: 16,
  },
  statBox: {
    alignItems: "center",
  },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  statLbl: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.surfaceBorder,
  },
  breakdownSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  subjectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  subInfo: {
    flex: 1,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  subCounts: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  subScore: {
    fontSize: 14,
    fontWeight: "800",
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  qReviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    marginBottom: 10,
  },
  qReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  qReviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  resultIconCorrect: {
    backgroundColor: Colors.accentMuted,
  },
  resultIconIncorrect: {
    backgroundColor: Colors.dangerMuted,
  },
  qReviewNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  qReviewText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
  answerComparison: {
    gap: 4,
  },
  ansLine: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  ansLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  ansVal: {
    fontSize: 12,
    fontWeight: "700",
  },
  textCorrect: {
    color: Colors.accent,
  },
  textIncorrect: {
    color: Colors.danger,
  },
  rationaleBox: {
    backgroundColor: "rgba(0,0,0,0.25)",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  rationaleTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 4,
  },
  rationaleBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    marginTop: 10,
  },
  retakeBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    gap: 8,
  },
  retakeBtnText: {
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
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
});

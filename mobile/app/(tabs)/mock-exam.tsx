import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Colors } from "@/constants/theme";
import PaywallModal from "@/components/PaywallModal";
import {
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  History,
} from "@/components/Icons";

export default function MockExamScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedPaper, setSelectedPaper] = useState<"Paper1" | "Paper2" | "Custom">("Paper1");
  const [questionCount, setQuestionCount] = useState<number>(50);
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = async () => {
    try {
      const res = await api.get<any>("/api/user/attempts");
      if (res?.attempts) {
        setAttempts(res.attempts);
      }
    } catch (e) {
      console.warn("Failed to load attempts:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = () => {
    if (!user?.isPro) {
      setShowPaywall(true);
      return;
    }

    router.push(
      `/exam/simulator?paperType=${selectedPaper}&count=${questionCount}&timeLimit=${timeLimit}`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.headerBadge}>
            <GraduationCap size={16} color={Colors.primary} />
            <Text style={styles.headerBadgeText}>CBT SIMULATOR</Text>
          </View>
          {user?.isPro ? (
            <View style={styles.proPill}>
              <Sparkles size={12} color="#FFFFFF" />
              <Text style={styles.proText}>UNLOCKED</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.lockPill} onPress={() => setShowPaywall(true)}>
              <Lock size={12} color="#F59E0B" />
              <Text style={styles.lockText}>PRO ONLY</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.title}>Council Exam Simulator</Text>
        <Text style={styles.subtitle}>
          Exact exam conditions with official council timers, random question pooling, and instant score analysis.
        </Text>
      </View>

      {/* Simulator Paper Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Select Council Examination Paper</Text>

        <TouchableOpacity
          style={[
            styles.paperCard,
            selectedPaper === "Paper1" && styles.paperCardActive,
          ]}
          onPress={() => {
            setSelectedPaper("Paper1");
            setQuestionCount(100);
            setTimeLimit(90);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.paperInfo}>
            <Text style={styles.paperTitle}>General Nursing Paper 1</Text>
            <Text style={styles.paperDesc}>
              Foundations of Nursing, Anatomy, Physiology, Pharmacology, & Medical-Surgical
            </Text>
            <View style={styles.paperMeta}>
              <Clock size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>90 Minutes • 100 Questions</Text>
            </View>
          </View>
          <View
            style={[
              styles.radioCircle,
              selectedPaper === "Paper1" && styles.radioCircleSelected,
            ]}
          >
            {selectedPaper === "Paper1" && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paperCard,
            selectedPaper === "Paper2" && styles.paperCardActive,
          ]}
          onPress={() => {
            setSelectedPaper("Paper2");
            setQuestionCount(100);
            setTimeLimit(90);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.paperInfo}>
            <Text style={styles.paperTitle}>Nursing Paper 2 (Specialties)</Text>
            <Text style={styles.paperDesc}>
              Maternal Health, Midwifery, Pediatric Care, Community Health, & Mental Health
            </Text>
            <View style={styles.paperMeta}>
              <Clock size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>90 Minutes • 100 Questions</Text>
            </View>
          </View>
          <View
            style={[
              styles.radioCircle,
              selectedPaper === "Paper2" && styles.radioCircleSelected,
            ]}
          >
            {selectedPaper === "Paper2" && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paperCard,
            selectedPaper === "Custom" && styles.paperCardActive,
          ]}
          onPress={() => {
            setSelectedPaper("Custom");
            setQuestionCount(50);
            setTimeLimit(45);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.paperInfo}>
            <Text style={styles.paperTitle}>Rapid Practice Drill (Custom)</Text>
            <Text style={styles.paperDesc}>
              Shortened randomized simulation for quick daily test readiness
            </Text>
            <View style={styles.paperMeta}>
              <Clock size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>45 Minutes • 50 Questions</Text>
            </View>
          </View>
          <View
            style={[
              styles.radioCircle,
              selectedPaper === "Custom" && styles.radioCircleSelected,
            ]}
          >
            {selectedPaper === "Custom" && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={handleStartExam}
        activeOpacity={0.85}
      >
        <View style={styles.btnContent}>
          <Play size={18} color={Colors.textInverse} fill={Colors.textInverse} />
          <Text style={styles.btnText}>Begin Timed Simulation</Text>
        </View>
      </TouchableOpacity>

      {/* Historical Attempts */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <History size={18} color={Colors.textSecondary} />
          <Text style={styles.historyTitle}>Past Attempt History</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        ) : attempts.length === 0 ? (
          <View style={styles.noAttempts}>
            <Text style={styles.noAttemptsText}>No previous attempts recorded.</Text>
          </View>
        ) : (
          attempts.slice(0, 5).map((att) => {
            const passed = att.passed || (att.score && att.score >= 50);
            return (
              <TouchableOpacity
                key={att._id}
                style={styles.attemptItem}
                onPress={() => router.push(`/exam/result/${att._id}`)}
              >
                <View style={styles.attemptLeft}>
                  <Text style={styles.attemptTitle}>
                    {att.paperTitle || att.courseId?.title || "Mock Exam"}
                  </Text>
                  <Text style={styles.attemptDate}>
                    {new Date(att.createdAt).toLocaleDateString()} • {att.totalQuestions} Questions
                  </Text>
                </View>
                <View
                  style={[
                    styles.scorePill,
                    passed ? styles.scorePillPassed : styles.scorePillFailed,
                  ]}
                >
                  <Text
                    style={[
                      styles.scorePillText,
                      passed ? styles.textPassed : styles.textFailed,
                    ]}
                  >
                    {att.score}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
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
  header: {
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  headerBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  proPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  proText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.warningMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  lockText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F59E0B",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  paperCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    marginBottom: 12,
  },
  paperCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "#EEF4FF",
  },
  paperInfo: {
    flex: 1,
    marginRight: 12,
  },
  paperTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  paperDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  paperMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "800",
  },
  historySection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  noAttempts: {
    paddingVertical: 16,
    alignItems: "center",
  },
  noAttemptsText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  attemptItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  attemptLeft: {
    flex: 1,
  },
  attemptTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  attemptDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scorePillPassed: {
    backgroundColor: Colors.accentMuted,
  },
  scorePillFailed: {
    backgroundColor: Colors.dangerMuted,
  },
  scorePillText: {
    fontSize: 13,
    fontWeight: "800",
  },
  textPassed: {
    color: Colors.accent,
  },
  textFailed: {
    color: Colors.danger,
  },
});

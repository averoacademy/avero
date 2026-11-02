import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Colors } from "@/constants/theme";
import {
  Flame,
  GraduationCap,
  Brain,
  Award,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
  ChevronRight,
  Target,
  Megaphone,
} from "@/components/Icons";

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [flashcardsDue, setFlashcardsDue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [statsRes, flashcardsRes, scheduleRes] = await Promise.all([
        api.get<any>("/api/user/stats").catch(() => null),
        api.get<any>("/api/user/flashcards?mode=due").catch(() => null),
        api.get<any>("/api/user/schedule").catch(() => null),
        refreshUser().catch(() => null),
      ]);

      const streakCount =
        scheduleRes?.schedule?.currentStreakDays ??
        statsRes?.currentStreakDays ??
        statsRes?.stats?.currentStreakDays;

      if (statsRes?.stats || streakCount !== undefined) {
        setStats({
          ...(statsRes?.stats || {}),
          currentStreakDays:
            streakCount ??
            user?.currentStreakDays ??
            0,
        });
      }

      if (statsRes) {
        setRecentAttempts(statsRes.recentAttempts || []);
        setAnnouncements(statsRes.announcements || []);
      }

      if (flashcardsRes?.cards) {
        setFlashcardsDue(flashcardsRes.cards.length);
      }
    } catch (err) {
      console.warn("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUser, user?.currentStreakDays]);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const firstName = user?.fullName?.split(" ")[0] || "Student";
  const streak =
    stats?.currentStreakDays ??
    user?.currentStreakDays ??
    0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Top App Bar with Avatar & Official Logo */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.topBarAvatar} />
            ) : (
              <View style={styles.topBarAvatarFallback}>
                <Text style={styles.topBarAvatarText}>
                  {user?.fullName ? user.fullName[0].toUpperCase() : "N"}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.brandContainer}>
            <Image
              source={require("@/assets/logo.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.greeting}>Welcome back, Nurse {firstName}</Text>
          </View>
        </View>
        <View style={styles.proBadge}>
          {user?.isPro ? (
            <View style={styles.proPill}>
              <Sparkles size={12} color="#FFFFFF" />
              <Text style={styles.proText}>PRO</Text>
            </View>
          ) : (
            <View style={styles.freePill}>
              <Text style={styles.freeText}>FREE</Text>
            </View>
          )}
        </View>
      </View>

      {/* Streak & Daily Motivation Card */}
      <View style={styles.streakCard}>
        <View style={styles.streakHeader}>
          <View style={styles.streakLeft}>
            <View style={styles.flameCircle}>
              <Flame size={24} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.streakCount}>{streak} Day Streak</Text>
              <Text style={styles.streakSub}>Active retention memory</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.streakAction}
            onPress={() => router.push("/(tabs)/flashcards")}
          >
            <Text style={styles.streakActionText}>Practice</Text>
          </TouchableOpacity>
        </View>

        {flashcardsDue > 0 && (
          <View style={styles.dueAlert}>
            <Brain size={16} color={Colors.primary} />
            <Text style={styles.dueAlertText}>
              <Text style={{ fontWeight: "700", color: Colors.primary }}>
                {flashcardsDue} flashcards
              </Text>{" "}
              due for spaced review today.
            </Text>
          </View>
        )}
      </View>

      {/* Quick Launch Buttons */}
      <View style={styles.quickLaunchRow}>
        <TouchableOpacity
          style={styles.launchCardMock}
          onPress={() => router.push("/(tabs)/mock-exam")}
          activeOpacity={0.85}
        >
          <View style={styles.launchIconBadge}>
            <GraduationCap size={22} color={Colors.primary} />
          </View>
          <Text style={styles.launchTitle}>Timed Mock Exam</Text>
          <Text style={styles.launchSub}>Simulate CBT conditions</Text>
          <View style={styles.launchArrow}>
            <ArrowRight size={16} color={Colors.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.launchCardCards}
          onPress={() => router.push("/(tabs)/flashcards")}
          activeOpacity={0.85}
        >
          <View style={[styles.launchIconBadge, { backgroundColor: Colors.accentMuted }]}>
            <Brain size={22} color={Colors.accent} />
          </View>
          <Text style={styles.launchTitle}>Flashcard Deck</Text>
          <Text style={styles.launchSub}>Rapid-fire active recall</Text>
          <View style={styles.launchArrow}>
            <ArrowRight size={16} color={Colors.accent} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Award size={20} color={Colors.primary} />
            <Text style={styles.statNumber}>{stats?.averageScore || 0}%</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>

          <View style={styles.statBox}>
            <Target size={20} color={Colors.accent} />
            <Text style={styles.statNumber}>{stats?.totalAttempts || 0}</Text>
            <Text style={styles.statLabel}>Exams Taken</Text>
          </View>

          <View style={styles.statBox}>
            <Clock size={20} color="#F59E0B" />
            <Text style={styles.statNumber}>
              {Math.round((stats?.totalTimeSpentSeconds || 0) / 60)}m
            </Text>
            <Text style={styles.statLabel}>Time Spent</Text>
          </View>
        </View>
      )}

      {/* Announcements if available */}
      {announcements.length > 0 && (
        <View style={styles.announcementCard}>
          <View style={styles.announcementHeader}>
            <Megaphone size={18} color="#F59E0B" />
            <Text style={styles.announcementTitle}>
              {announcements[0]?.title || "Exam Notice"}
            </Text>
          </View>
          <Text style={styles.announcementBody} numberOfLines={2}>
            {announcements[0]?.message || announcements[0]?.content}
          </Text>
        </View>
      )}

      {/* Recent Attempts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Mock Attempts</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/mock-exam")}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentAttempts.length === 0 ? (
        <View style={styles.emptyCard}>
          <BookOpen size={32} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Exam Attempts Yet</Text>
          <Text style={styles.emptySub}>
            Take your first timed mock exam to see your score analysis here.
          </Text>
          <TouchableOpacity
            style={styles.startMockBtn}
            onPress={() => router.push("/(tabs)/mock-exam")}
          >
            <Text style={styles.startMockText}>Start Mock Exam</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentAttempts.slice(0, 3).map((attempt, index) => {
          const passed = attempt.passed || (attempt.score && attempt.score >= 50);
          return (
            <View key={attempt._id || index} style={styles.attemptCard}>
              <View style={styles.attemptInfo}>
                <Text style={styles.attemptCourse}>
                  {attempt.courseId?.title || "Nursing Council Mock Exam"}
                </Text>
                <Text style={styles.attemptDate}>
                  {new Date(attempt.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.scoreBadge,
                  passed ? styles.scorePassed : styles.scoreFailed,
                ]}
              >
                <Text
                  style={[
                    styles.scoreText,
                    passed ? styles.scoreTextPassed : styles.scoreTextFailed,
                  ]}
                >
                  {attempt.score || 0}%
                </Text>
              </View>
            </View>
          );
        })
      )}
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
  topBarLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarButton: {
    position: "relative",
  },
  topBarAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  topBarAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarAvatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
  },
  brandContainer: {
    flex: 1,
    justifyContent: "center",
  },
  brandLogo: {
    width: 125,
    height: 32,
    marginBottom: 2,
  },
  greeting: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  proBadge: {},
  proPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  proText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  freePill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  freeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  streakCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  streakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flameCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.warningMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  streakCount: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  streakSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  streakAction: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  streakActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  dueAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  dueAlertText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quickLaunchRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  launchCardMock: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    position: "relative",
  },
  launchCardCards: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    position: "relative",
  },
  launchIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  launchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  launchSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  launchArrow: {
    position: "absolute",
    right: 12,
    top: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  announcementCard: {
    backgroundColor: Colors.warningMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    padding: 14,
    marginBottom: 20,
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  announcementTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FDE68A",
  },
  announcementBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  startMockBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  startMockText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: "700",
  },
  attemptCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    marginBottom: 10,
  },
  attemptInfo: {
    flex: 1,
  },
  attemptCourse: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  attemptDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scorePassed: {
    backgroundColor: Colors.accentMuted,
  },
  scoreFailed: {
    backgroundColor: Colors.dangerMuted,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "800",
  },
  scoreTextPassed: {
    color: Colors.accent,
  },
  scoreTextFailed: {
    color: Colors.danger,
  },
});

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Colors } from "@/constants/theme";
import PaywallModal from "@/components/PaywallModal";
import {
  Brain,
  RotateCw,
  CheckCircle2,
  Sparkles,
  Lock,
  Flame,
  ChevronRight,
  BookOpen,
} from "@/components/Icons";

const { width } = Dimensions.get("window");

export default function FlashcardsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Animated Flip values
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>("/api/user/flashcards?mode=due");
      if (res?.cards) {
        setCards(res.cards);
      }
    } catch (e) {
      console.warn("Failed to fetch flashcards:", e);
    } finally {
      setLoading(false);
    }
  };

  const flipCard = () => {
    if (isFlipped) {
      Animated.spring(animatedValue, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
      setIsFlipped(false);
    } else {
      Animated.spring(animatedValue, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
      setIsFlipped(true);
    }
  };

  const handleRating = async (rating: number) => {
    if (submittingRating || cards.length === 0) return;
    const currentCard = cards[currentIndex];
    setSubmittingRating(true);

    try {
      await api.post("/api/user/flashcards/review", {
        cardId: currentCard._id,
        rating,
      });

      // Reset flip back to front
      animatedValue.setValue(0);
      setIsFlipped(false);

      // Move to next card
      setCurrentIndex((prev) => prev + 1);
    } catch (e) {
      console.warn("Failed to submit review rating:", e);
    } finally {
      setSubmittingRating(false);
    }
  };

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const frontOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  if (!user?.isPro) {
    return (
      <View style={styles.proLockContainer}>
        <View style={styles.lockIconCircle}>
          <Lock size={36} color="#F59E0B" />
        </View>
        <Text style={styles.lockTitle}>Spaced Retention Flashcards</Text>
        <Text style={styles.lockSubtitle}>
          Our adaptive SM-2 spaced repetition algorithm schedules flashcards at the exact optimal moment before you forget. Exclusive to Pro candidates.
        </Text>
        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => setShowPaywall(true)}
        >
          <Text style={styles.upgradeBtnText}>Upgrade to Avero Pro</Text>
        </TouchableOpacity>

        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your scheduled deck...</Text>
      </View>
    );
  }

  const currentCard = cards[currentIndex];
  const isFinished = currentIndex >= cards.length || cards.length === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <Brain size={22} color={Colors.primary} />
            <Text style={styles.title}>Spaced Flashcards</Text>
          </View>
          <View style={styles.progressPill}>
            <Text style={styles.progressPillText}>
              {isFinished ? cards.length : currentIndex + 1} / {cards.length}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Tap the card to reveal the answer and rationale
        </Text>
      </View>

      {/* Main Flashcard Body */}
      {isFinished ? (
        <View style={styles.finishedCard}>
          <View style={styles.celebrateCircle}>
            <CheckCircle2 size={48} color={Colors.accent} />
          </View>
          <Text style={styles.finishedTitle}>Deck Complete!</Text>
          <Text style={styles.finishedSub}>
            You've completed all scheduled retention flashcards for today. Keep your streak going tomorrow!
          </Text>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => router.push("/(tabs)/mock-exam")}
          >
            <Text style={styles.continueBtnText}>Take a Timed Mock Exam</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cardContainer}>
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={flipCard}
            style={styles.touchableCard}
          >
            {/* Front Card */}
            <Animated.View
              style={[
                styles.flipCard,
                {
                  transform: [{ rotateY: frontInterpolate }],
                  opacity: frontOpacity,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.subjectBadge}>
                  <Text style={styles.subjectText}>
                    {currentCard?.courseId?.title || "Clinical Subject"}
                  </Text>
                </View>
                <RotateCw size={16} color={Colors.textMuted} />
              </View>

              <ScrollView
                style={styles.cardScroll}
                contentContainerStyle={styles.cardContent}
              >
                <Text style={styles.cardQuestion}>
                  {currentCard?.questionText}
                </Text>
              </ScrollView>

              <View style={styles.cardFooter}>
                <Text style={styles.tapPrompt}>Tap anywhere to flip card</Text>
              </View>
            </Animated.View>

            {/* Back Card */}
            <Animated.View
              style={[
                styles.flipCard,
                styles.flipCardBack,
                {
                  transform: [{ rotateY: backInterpolate }],
                  opacity: backOpacity,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.subjectBadge, { backgroundColor: Colors.accentMuted }]}>
                  <Text style={[styles.subjectText, { color: Colors.accent }]}>
                    Correct Answer & Rationale
                  </Text>
                </View>
                <RotateCw size={16} color={Colors.textMuted} />
              </View>

              <ScrollView
                style={styles.cardScroll}
                contentContainerStyle={styles.cardContent}
              >
                <Text style={styles.answerLabel}>CORRECT ANSWER:</Text>
                <Text style={styles.cardAnswer}>
                  {currentCard?.correctAnswer}
                </Text>

                {currentCard?.explanation ? (
                  <View style={styles.rationaleBox}>
                    <Text style={styles.rationaleLabel}>CLINICAL RATIONALE:</Text>
                    <Text style={styles.rationaleText}>
                      {currentCard.explanation}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>

          {/* SM-2 Spaced Repetition Buttons */}
          <View style={styles.ratingsContainer}>
            <Text style={styles.ratingPrompt}>Rate how well you knew this:</Text>
            <View style={styles.ratingButtonsRow}>
              <TouchableOpacity
                style={[styles.ratingBtn, styles.btnAgain]}
                onPress={() => handleRating(1)}
                disabled={submittingRating}
              >
                <Text style={styles.ratingBtnText}>Again</Text>
                <Text style={styles.ratingSub}>&lt; 1 day</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ratingBtn, styles.btnHard]}
                onPress={() => handleRating(3)}
                disabled={submittingRating}
              >
                <Text style={styles.ratingBtnText}>Hard</Text>
                <Text style={styles.ratingSub}>2 days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ratingBtn, styles.btnGood]}
                onPress={() => handleRating(4)}
                disabled={submittingRating}
              >
                <Text style={styles.ratingBtnText}>Good</Text>
                <Text style={styles.ratingSub}>4 days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ratingBtn, styles.btnEasy]}
                onPress={() => handleRating(5)}
                disabled={submittingRating}
              >
                <Text style={styles.ratingBtnText}>Easy</Text>
                <Text style={styles.ratingSub}>7 days</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  progressPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  progressPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    paddingBottom: 20,
  },
  touchableCard: {
    flex: 1,
    position: "relative",
  },
  flipCard: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    padding: 20,
    justifyContent: "space-between",
    backfaceVisibility: "hidden",
  },
  flipCardBack: {
    backgroundColor: "#F0F4FF",
    borderColor: Colors.primary,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  subjectBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  cardScroll: {
    flex: 1,
  },
  cardContent: {
    justifyContent: "center",
    paddingVertical: 10,
  },
  cardQuestion: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  cardFooter: {
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: 12,
  },
  tapPrompt: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  answerLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.accent,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardAnswer: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 16,
  },
  rationaleBox: {
    backgroundColor: "rgba(0,0,0,0.25)",
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  rationaleLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 4,
  },
  rationaleText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  ratingsContainer: {
    marginTop: 16,
  },
  ratingPrompt: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 10,
  },
  ratingButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  ratingBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  btnAgain: {
    backgroundColor: Colors.dangerMuted,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  btnHard: {
    backgroundColor: Colors.warningMuted,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  btnGood: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  btnEasy: {
    backgroundColor: Colors.accentMuted,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  ratingBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  ratingSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 14,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  proLockContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  lockIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.warningMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  lockSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 24,
  },
  upgradeBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  upgradeBtnText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: "700",
  },
  finishedCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    margin: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  celebrateCircle: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: Colors.accentMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  finishedTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  finishedSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  continueBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  continueBtnText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: "700",
  },
});

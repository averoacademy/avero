import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Colors } from "@/constants/theme";
import {
  Sparkles,
  CheckCircle2,
  X,
  CreditCard,
  ShieldCheck,
  AlertCircle,
} from "@/components/Icons";

WebBrowser.maybeCompleteAuthSession();

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PaywallModal({ visible, onClose, onSuccess }: PaywallModalProps) {
  const { refreshUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"pro_monthly" | "pro_annual">("pro_monthly");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Dynamic pricing loaded from Admin settings in MongoDB
  const [pricing, setPricing] = useState<{
    monthlyPriceNaira: number;
    annualPriceNaira: number;
    isSubscriptionEnabled: boolean;
  }>({
    monthlyPriceNaira: 2000,
    annualPriceNaira: 20000,
    isSubscriptionEnabled: true,
  });
  const [loadingPricing, setLoadingPricing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPricingSettings();
    }
  }, [visible]);

  const loadPricingSettings = async () => {
    setLoadingPricing(true);
    try {
      const res = await api.get<any>("/api/settings");
      if (res?.success && res.settings) {
        setPricing({
          monthlyPriceNaira:
            typeof res.settings.monthlyPriceNaira === "number"
              ? res.settings.monthlyPriceNaira
              : 2000,
          annualPriceNaira:
            typeof res.settings.annualPriceNaira === "number"
              ? res.settings.annualPriceNaira
              : 20000,
          isSubscriptionEnabled: res.settings.isSubscriptionEnabled !== false,
        });
      }
    } catch (e) {
      console.warn("Failed to load admin pricing settings:", e);
    } finally {
      setLoadingPricing(false);
    }
  };

  const monthlyPrice = pricing.monthlyPriceNaira;
  const annualPrice = pricing.annualPriceNaira;
  const fullYearAtMonthlyRate = monthlyPrice * 12;
  const savingsPercent =
    fullYearAtMonthlyRate > annualPrice && fullYearAtMonthlyRate > 0
      ? Math.round(((fullYearAtMonthlyRate - annualPrice) / fullYearAtMonthlyRate) * 100)
      : 0;
  const annualPerMonth = Math.round(annualPrice / 12);

  const handleSubscribe = async () => {
    if (!pricing.isSubscriptionEnabled) {
      Alert.alert(
        "Subscription Paused",
        "Subscriptions are temporarily paused by administration. Please check back later."
      );
      return;
    }

    setLoading(true);
    try {
      // 1. Initialize transaction with backend (uses current DB prices)
      const res = await api.post<any>("/api/paystack/initialize", {
        plan: selectedPlan,
      });

      if (!res?.authorization_url || !res?.reference) {
        throw new Error(res?.error || "Could not initialize Paystack checkout.");
      }

      const { authorization_url, reference } = res;

      // 2. Open in-app browser for payment
      setLoading(false);
      await WebBrowser.openAuthSessionAsync(authorization_url, "avero://");

      // 3. Verify transaction after user completes or returns
      setVerifying(true);
      const verifyRes = await api.get<any>(`/api/paystack/verify?reference=${reference}`);

      if (verifyRes?.success) {
        await refreshUser();
        Alert.alert(
          "Pro Membership Activated! 🎉",
          "Welcome to Avero Pro! You now have unlimited access to the Council CBT Simulator, Spaced Flashcards, and Question Banks.",
          [
            {
              text: "Get Started",
              onPress: () => {
                onClose();
                onSuccess?.();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Payment Pending",
          "If you completed the payment, your Pro access will automatically activate within a minute. You can refresh your profile to check status.",
          [{ text: "OK", onPress: onClose }]
        );
      }
    } catch (e: any) {
      Alert.alert("Subscription Error", e?.message || "Payment process could not be completed.");
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Header Badge */}
            <View style={styles.header}>
              <View style={styles.badgeCircle}>
                <Sparkles size={28} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Upgrade to Avero Pro</Text>
              <Text style={styles.subtitle}>
                Pass your Nursing Council Examination with complete confidence
              </Text>
            </View>

            {/* Feature List */}
            <View style={styles.featuresBox}>
              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color={Colors.accent} style={styles.featureIcon} />
                <Text style={styles.featureText}>
                  <Text style={styles.featureBold}>Full 250-Question CBT Simulator</Text> with official council timing
                </Text>
              </View>

              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color={Colors.accent} style={styles.featureIcon} />
                <Text style={styles.featureText}>
                  <Text style={styles.featureBold}>Adaptive SM-2 Flashcards</Text> for rapid active recall retention
                </Text>
              </View>

              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color={Colors.accent} style={styles.featureIcon} />
                <Text style={styles.featureText}>
                  <Text style={styles.featureBold}>In-Depth Clinical Rationales</Text> for every single question
                </Text>
              </View>

              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color={Colors.accent} style={styles.featureIcon} />
                <Text style={styles.featureText}>
                  <Text style={styles.featureBold}>OSCE Practicals & Marking Schemes</Text> for clinical assessment
                </Text>
              </View>
            </View>

            {/* Plan Selector */}
            <View style={styles.plansContainer}>
              {/* Monthly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === "pro_monthly" && styles.planCardActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedPlan("pro_monthly")}
              >
                <View style={styles.planRadio}>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedPlan === "pro_monthly" && styles.radioCircleActive,
                    ]}
                  >
                    {selectedPlan === "pro_monthly" && <View style={styles.radioDot} />}
                  </View>
                  <View>
                    <Text style={styles.planName}>Monthly Access</Text>
                    <Text style={styles.planBilled}>Billed monthly, cancel anytime</Text>
                  </View>
                </View>

                {loadingPricing ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.planPrice}>₦{monthlyPrice.toLocaleString()}</Text>
                )}
              </TouchableOpacity>

              {/* Annual Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === "pro_annual" && styles.planCardActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedPlan("pro_annual")}
              >
                {savingsPercent > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>SAVE {savingsPercent}%</Text>
                  </View>
                )}

                <View style={styles.planRadio}>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedPlan === "pro_annual" && styles.radioCircleActive,
                    ]}
                  >
                    {selectedPlan === "pro_annual" && <View style={styles.radioDot} />}
                  </View>
                  <View>
                    <Text style={styles.planName}>Annual Access</Text>
                    <Text style={styles.planBilled}>
                      Full year access • ₦{annualPerMonth.toLocaleString()}/mo
                    </Text>
                  </View>
                </View>

                {loadingPricing ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.planPrice}>₦{annualPrice.toLocaleString()}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Subscription Disabled Notice */}
            {!pricing.isSubscriptionEnabled && (
              <View style={styles.disabledBanner}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={styles.disabledText}>
                  Subscriptions are temporarily disabled by administration.
                </Text>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                (loading || verifying || !pricing.isSubscriptionEnabled) && styles.btnDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={loading || verifying || !pricing.isSubscriptionEnabled}
              activeOpacity={0.85}
            >
              {loading || verifying ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={Colors.textInverse} />
                  <Text style={styles.checkoutBtnText}>
                    {verifying ? "Verifying with Paystack..." : "Connecting to Paystack..."}
                  </Text>
                </View>
              ) : (
                <View style={styles.btnContent}>
                  <CreditCard size={18} color={Colors.textInverse} />
                  <Text style={styles.checkoutBtnText}>
                    Pay with Paystack (Secure)
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.secureFooter}>
              <ShieldCheck size={14} color={Colors.textMuted} />
              <Text style={styles.secureText}>
                256-bit Bank-grade encryption via Paystack
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: "90%",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    top: 20,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  badgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  featuresBox: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  featureBold: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    position: "relative",
  },
  planCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "#EEF4FF",
  },
  planRadio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleActive: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  planName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  planBilled: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  discountBadge: {
    position: "absolute",
    top: -10,
    right: 14,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 5,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  disabledBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  disabledText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkoutBtnText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: "700",
  },
  secureFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  secureText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});

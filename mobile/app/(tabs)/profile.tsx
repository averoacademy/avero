import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Colors } from "@/constants/theme";
import PaywallModal from "@/components/PaywallModal";
import {
  User,
  GraduationCap,
  Sparkles,
  Building2,
  Calendar,
  Bell,
  LogOut,
  ChevronRight,
  Shield,
  CreditCard,
  Mail,
  Camera,
} from "lucide-react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUserAvatar } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Avero Academy?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const getInitials = (name?: string) => {
    if (!name) return "N";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const handlePickImage = () => {
    Alert.alert(
      "Profile Picture",
      "Upload a picture for your Avero Academy account",
      [
        {
          text: "Take Photo",
          onPress: () => processImagePick(true),
        },
        {
          text: "Choose from Gallery",
          onPress: () => processImagePick(false),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const processImagePick = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Needed", "Camera permission is required to take a profile photo.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Needed", "Photo gallery permission is required to choose a picture.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const localUri = asset.uri;
        const base64Data = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setUploadingImage(true);

        // 1. Immediately update and persist locally so image displays on Profile and Dashboard instantly
        await updateUserAvatar(localUri);

        // 2. Sync with backend API in background
        try {
          const res = await api.post<any>("/api/user/avatar", {
            avatar: base64Data,
          });

          if (res?.success && res.avatarUrl) {
            await updateUserAvatar(res.avatarUrl);
          }
        } catch (syncErr) {
          console.log("Remote backend avatar sync pending cloud deployment:", syncErr);
        }

        Alert.alert("Success 🎉", "Profile picture updated successfully!");
      }
    } catch (err: any) {
      console.warn("Avatar upload error:", err);
      Alert.alert("Upload Error", err?.message || "Could not upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Profile Info */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={handlePickImage}
          activeOpacity={0.85}
          disabled={uploadingImage}
        >
          <View style={styles.avatarCircle}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(user?.fullName)}</Text>
            )}
            {uploadingImage && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.cameraBadge}>
            <Camera size={13} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <Text style={styles.userName}>{user?.fullName || "Nursing Candidate"}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>

        <View style={styles.badgeRow}>
          {user?.isPro ? (
            <View style={styles.proBadge}>
              <Sparkles size={12} color="#FFFFFF" />
              <Text style={styles.proText}>AVERO PRO MEMBER</Text>
            </View>
          ) : (
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>FREE CANDIDATE PLAN</Text>
            </View>
          )}
        </View>
      </View>

      {/* Pro Upgrade / Subscription Card */}
      {!user?.isPro ? (
        <View style={styles.upgradeCard}>
          <View style={styles.upgradeHeader}>
            <Sparkles size={20} color={Colors.primary} />
            <Text style={styles.upgradeTitle}>Unlock Avero Pro</Text>
          </View>
          <Text style={styles.upgradeDesc}>
            Get full access to the 250-question Council CBT Simulator, Spaced Retention Flashcards, and OSCE clinical practicals.
          </Text>
          <TouchableOpacity
            style={styles.upgradeActionBtn}
            activeOpacity={0.85}
            onPress={() => setShowPaywall(true)}
          >
            <Text style={styles.upgradeActionText}>Upgrade via Paystack</Text>
            <ChevronRight size={16} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.activeProCard}>
          <View style={styles.upgradeHeader}>
            <Sparkles size={18} color={Colors.accent} />
            <Text style={[styles.upgradeTitle, { color: Colors.accent }]}>
              Pro Membership Active
            </Text>
          </View>
          <Text style={styles.upgradeDesc}>
            You have full unlimited access to all Nursing Council past questions, CBT simulations, and flashcard decks.
          </Text>
        </View>
      )}

      {/* Academic Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Academic Profile</Text>

        <View style={styles.detailRow}>
          <View style={styles.detailIconBadge}>
            <GraduationCap size={18} color={Colors.primary} />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailLabel}>Specialty / Program</Text>
            <Text style={styles.detailValue}>
              {user?.studentType || "Not specified"}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIconBadge}>
            <Building2 size={18} color={Colors.primary} />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailLabel}>Institution</Text>
            <Text style={styles.detailValue}>
              {user?.university || "Not specified"}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIconBadge}>
            <Calendar size={18} color={Colors.primary} />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailLabel}>Target Council Exam Year</Text>
            <Text style={styles.detailValue}>
              {user?.gradYear || "Not specified"}
            </Text>
          </View>
        </View>
      </View>

      {/* Preferences & Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.detailIconBadge}>
              <Bell size={18} color={Colors.accent} />
            </View>
            <View>
              <Text style={styles.settingTitle}>Study Prompts</Text>
              <Text style={styles.settingSub}>Daily retention reminders</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
            thumbColor={Colors.textPrimary}
          />
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <LogOut size={18} color={Colors.danger} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Avero Academy Mobile v1.0.0</Text>

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
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: Colors.surface,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 43,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  badgeRow: {
    marginTop: 10,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  freeBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  freeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  upgradeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    padding: 18,
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  activeProCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    padding: 18,
    marginBottom: 24,
  },
  upgradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  upgradeDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  upgradeActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  upgradeActionText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  detailIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "700",
    marginTop: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  settingSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 20,
  },
});

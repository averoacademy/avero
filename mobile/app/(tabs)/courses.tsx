import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/constants/theme";
import {
  Search,
  BookOpen,
  Clock,
  Award,
  ChevronRight,
  Filter,
  Sparkles,
} from "lucide-react-native";

export default function CoursesScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      let endpoint = "/api/user/courses";
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory) params.append("category", selectedCategory);
      if (params.toString()) endpoint += `?${params.toString()}`;

      const res = await api.get<any>(endpoint);
      if (res?.courses) setCourses(res.courses);
      if (res?.categories) setCategories(res.categories);
    } catch (e) {
      console.warn("Failed to load courses:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Courses & Past Qs</Text>
        <Text style={styles.subtitle}>
          Subject-based nursing council past question modules
        </Text>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Search size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects, topics, or modules..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <TouchableOpacity
            style={[
              styles.catChip,
              selectedCategory === "" && styles.catChipActive,
            ]}
            onPress={() => setSelectedCategory("")}
          >
            <Text
              style={[
                styles.catChipText,
                selectedCategory === "" && styles.catChipTextActive,
              ]}
            >
              All Subjects
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const active = selectedCategory === cat._id;
            return (
              <TouchableOpacity
                key={cat._id}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => setSelectedCategory(active ? "" : cat._id)}
              >
                <Text
                  style={[
                    styles.catChipText,
                    active && styles.catChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Courses List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCourses();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : courses.length === 0 ? (
          <View style={styles.emptyView}>
            <BookOpen size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Courses Found</Text>
            <Text style={styles.emptySub}>
              Try adjusting your search query or subject filters.
            </Text>
          </View>
        ) : (
          courses.map((course) => {
            const qCount = course.questions?.length || 0;
            return (
              <TouchableOpacity
                key={course._id}
                style={styles.courseCard}
                activeOpacity={0.85}
                onPress={() => {
                  router.push(`/exam/${course._id}?mode=Practice`);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {course.categoryId?.name || course.subcategoryName || "Nursing"}
                      </Text>
                    </View>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>{course.level}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.courseTitle}>{course.title}</Text>
                <Text style={styles.courseDesc} numberOfLines={2}>
                  {course.description}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.metaItem}>
                    <BookOpen size={14} color={Colors.primary} />
                    <Text style={styles.metaText}>{qCount} Questions</Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Clock size={14} color="#F59E0B" />
                    <Text style={styles.metaText}>
                      {course.timeLimitMinutes || 45} mins
                    </Text>
                  </View>

                  <View style={styles.practiceBtn}>
                    <Text style={styles.practiceBtnText}>Practice</Text>
                    <ChevronRight size={14} color={Colors.textInverse} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
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
    marginBottom: 14,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  catChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  catChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  catChipTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  courseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  levelBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelBadgeText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  courseDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  practiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  practiceBtnText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyView: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});

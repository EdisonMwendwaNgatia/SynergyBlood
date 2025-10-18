import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import hospitalsData from "../data/hospitals.json";

const { height } = Dimensions.get("window");

export default function DonateBloodScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Haversine distance calculator
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location access is required to show nearby hospitals.");
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);

        const nearby = hospitalsData.filter((h) => {
          const dist = getDistance(
            location.coords.latitude,
            location.coords.longitude,
            h.latitude,
            h.longitude
          );
          return dist <= 20;
        });

        setNearbyHospitals(nearby);
        setLoading(false);
      } catch (err) {
        Alert.alert("Error", err.message);
        setLoading(false);
      }
    })();
  }, []);

  const openInMaps = (hospital) => {
    const lat = hospital.latitude;
    const lon = hospital.longitude;
    const name = encodeURIComponent(hospital.name || "Hospital");

    let url = "";
    if (Platform.OS === "ios") {
      url = `maps://?q=${name}&ll=${lat},${lon}`;
    } else {
      url = `geo:${lat},${lon}?q=${lat},${lon}(${name})`;
    }

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
    });
  };

  if (loading) {
    return (
      <LinearGradient colors={["#F5F5F5", "#FFFFFF"]} style={styles.center}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCircle}>
            <ActivityIndicator size="large" color="#C41E3A" />
          </View>
          <Text style={styles.loadingText}>Finding nearby hospitals...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <LinearGradient
        colors={["#C41E3A", "#8B0000"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Donate Blood</Text>
          <Text style={styles.headerSubtitle}>Find nearby donation centers</Text>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{nearbyHospitals.length}</Text>
            <Text style={styles.statLabel}>Centers Found</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>20km</Text>
            <Text style={styles.statLabel}>Search Radius</Text>
          </View>
        </View>
      </LinearGradient>

      {nearbyHospitals.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏥</Text>
          <Text style={styles.emptyTitle}>No Centers Found</Text>
          <Text style={styles.emptyText}>
            No hospitals found within 20 km radius.{"\n"}Try again later.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={nearbyHospitals}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.hospitalsListContent}
          renderItem={({ item }) => {
            const distance = getDistance(
              userLocation?.latitude,
              userLocation?.longitude,
              item.latitude,
              item.longitude
            );

            return (
              <View style={styles.hospitalCard}>
                <View style={styles.hospitalCardContent}>
                  <View style={styles.hospitalIconContainer}>
                    <Text style={styles.hospitalIcon}>🏥</Text>
                  </View>
                  <View style={styles.hospitalInfo}>
                    <Text style={styles.hospitalName}>{item.name}</Text>
                    <Text style={styles.hospitalAddress}>{item.address}</Text>
                    <Text style={styles.hospitalDistance}>{distance.toFixed(1)} km away</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => openInMaps(item)}
                >
                  <LinearGradient
                    colors={["#007AFF", "#0051D5"]}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.locationButtonText}>📍 Open in Maps</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingContainer: { alignItems: "center" },
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 5,
  },
  loadingText: { fontSize: 18, fontWeight: "600", color: "#2C2C2C" },
  loadingSubtext: { fontSize: 14, color: "#666" },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 6,
  },
  headerContent: { marginBottom: 15 },
  headerTitle: { fontSize: 32, fontWeight: "bold", color: "#FFF" },
  headerSubtitle: { fontSize: 16, color: "rgba(255,255,255,0.9)" },
  headerStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 15,
  },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.9)" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.3)" },
  emptyState: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
  emptyTitle: { fontSize: 22, fontWeight: "bold", color: "#2C2C2C" },
  emptyText: { fontSize: 15, color: "#666", textAlign: "center" },
  hospitalsListContent: { padding: 15 },
  hospitalCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },
  hospitalCardContent: { flexDirection: "row", alignItems: "center" },
  hospitalIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  hospitalIcon: { fontSize: 24 },
  hospitalInfo: { flex: 1 },
  hospitalName: { fontWeight: "bold", fontSize: 16, color: "#2C2C2C" },
  hospitalAddress: { fontSize: 13, color: "#666", marginBottom: 4 },
  hospitalDistance: { fontSize: 13, color: "#C41E3A", fontWeight: "600" },
  locationButton: { marginTop: 10 },
  buttonGradient: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  locationButtonText: { color: "#FFF", fontWeight: "bold" },
});

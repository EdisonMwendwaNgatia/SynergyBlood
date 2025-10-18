import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { auth, db } from "../firebaseConfig";
import { ref, get, onValue, off, update } from "firebase/database";
import { LinearGradient } from "expo-linear-gradient";

// Conditionally load react-native-maps only on native platforms
let MapView, Marker;
if (Platform.OS !== "web") {
  const RNMaps = require("react-native-maps");
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
}

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  useEffect(() => {
    let mounted = true;

    const notifRef = ref(db, "notifications");
    const callback = (snap) => {
      if (!mounted) return;
      if (snap.exists()) {
        const val = snap.val();
        const list = Object.entries(val).map(([id, n]) => ({ id, ...n }));
        const activeNotifications = list.filter((n) => n.status === "active");
        setNotifications(activeNotifications);
      } else {
        setNotifications([]);
      }
      setLoading(false);
    };
    onValue(notifRef, callback);

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          if (mounted) {
            setUserCoords({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      } catch {}

      try {
        const user = auth.currentUser;
        if (user) {
          const infoSnap = await get(ref(db, `users/${user.uid}/medicalInfo`));
          if (infoSnap.exists()) {
            const info = infoSnap.val();
            if (info.latitude && info.longitude && mounted) {
              setUserCoords({
                latitude: parseFloat(info.latitude),
                longitude: parseFloat(info.longitude),
              });
            }
          }
        }
      } catch (e) {
        if (mounted) {
          Alert.alert("Error", e.message);
        }
      }
    })();

    return () => {
      mounted = false;
      off(notifRef, "value", callback);
    };
  }, []);

  const handleFindLocation = (notification) => {
    const lat = parseFloat(notification.requesterCoords.latitude);
    const lon = parseFloat(notification.requesterCoords.longitude);
    const name = encodeURIComponent(notification.hospitalName || "Hospital");

    let url = "";
    if (Platform.OS === "ios") {
      // Apple Maps
      url = `maps://?q=${name}&ll=${lat},${lon}`;
    } else {
      // Google Maps
      url = `geo:${lat},${lon}?q=${lat},${lon}(${name})`;
    }

    Linking.openURL(url).catch(() => {
      // Fallback to web
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
      );
    });
  };

  const openGoogleMapsApp = (latitude, longitude, hospitalName) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${encodeURIComponent(
      hospitalName
    )}`;

    Linking.openURL(url).catch((err) => {
      const webUrl = `https://www.google.com/maps/@${latitude},${longitude},15z`;
      Linking.openURL(webUrl).catch((fallbackErr) => {
        Alert.alert("Error", "Could not open Google Maps");
      });
    });
  };

  const dismissNotification = async (notificationId) => {
    setDismissing(true);
    try {
      const notificationRef = ref(db, `notifications/${notificationId}`);
      await update(notificationRef, {
        status: "dismissed",
        dismissedAt: Date.now(),
        dismissedBy: auth.currentUser?.uid,
      });
      Alert.alert("Success", "Notification dismissed");
    } catch (error) {
      Alert.alert("Error", "Failed to dismiss notification");
    } finally {
      setDismissing(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["#8B0000", "#C41E3A"]}
        style={styles.loadingContainer}
      >
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#C41E3A" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </LinearGradient>
    );
  }

  const uid = auth.currentUser?.uid;

  const nearbyNotifs = userCoords
    ? notifications.reduce((acc, n) => {
        if (!n || !n.requesterCoords) return acc;
        if (n.status && n.status !== "active") return acc;
        if (n.requesterId && uid && n.requesterId === uid) return acc;

        const lat1 = parseFloat(userCoords.latitude);
        const lon1 = parseFloat(userCoords.longitude);
        const lat2 = parseFloat(n.requesterCoords.latitude);
        const lon2 = parseFloat(n.requesterCoords.longitude);
        if ([lat1, lon1, lat2, lon2].some((v) => Number.isNaN(v))) return acc;

        const dist = getDistance(lat1, lon1, lat2, lon2);
        if (dist <= 20) acc.push({ ...n, _distanceKm: dist });
        return acc;
      }, [])
    : [];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#8B0000", "#C41E3A", "#8B0000"]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>🩸</Text>
          </View>
          <Text style={styles.headerTitle}>Blood Requests</Text>
          <Text style={styles.headerSubtitle}>
            People near you need your help
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Map Section */}
        {showMap && selectedLocation && Platform.OS !== "web" && (
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>📍 Hospital Location</Text>
              <TouchableOpacity
                style={styles.closeMapButton}
                onPress={() => setShowMap(false)}
              >
                <Text style={styles.closeMapText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapInfoCard}>
              <Text style={styles.mapHospitalName}>
                {selectedLocation.hospitalName}
              </Text>
              <Text style={styles.mapAddress}>
                {selectedLocation.hospitalLocation}
              </Text>
              <View style={styles.patientInfoBadge}>
                <Text style={styles.patientInfoText}>
                  Patient: {selectedLocation.requesterName}
                </Text>
                <View style={styles.bloodGroupBadge}>
                  <Text style={styles.bloodGroupText}>
                    {selectedLocation.bloodGroup}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.mapWrapper}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  title={selectedLocation.hospitalName}
                  description={selectedLocation.hospitalLocation}
                  pinColor="#C41E3A"
                />

                {userCoords && (
                  <Marker
                    coordinate={{
                      latitude: userCoords.latitude,
                      longitude: userCoords.longitude,
                    }}
                    title="Your Location"
                    pinColor="#007AFF"
                  />
                )}
              </MapView>
            </View>

            <TouchableOpacity
              style={styles.openMapsButton}
              onPress={() =>
                openGoogleMapsApp(
                  selectedLocation.latitude,
                  selectedLocation.longitude,
                  selectedLocation.hospitalName
                )
              }
            >
              <LinearGradient
                colors={["#34A853", "#2D8E47"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.openMapsButtonText}>
                  🗺️ Open in Google Maps
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Web fallback */}
        {showMap && selectedLocation && Platform.OS === "web" && (
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>📍 Hospital Location</Text>
              <TouchableOpacity
                style={styles.closeMapButton}
                onPress={() => setShowMap(false)}
              >
                <Text style={styles.closeMapText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapInfoCard}>
              <Text style={styles.mapHospitalName}>
                {selectedLocation.hospitalName}
              </Text>
              <Text style={styles.mapAddress}>
                {selectedLocation.hospitalLocation}
              </Text>
            </View>

            <View style={styles.webMapPlaceholder}>
              <Text style={styles.webMapIcon}>🗺️</Text>
              <Text style={styles.webMapText}>
                Map view available in mobile app
              </Text>
            </View>

            <TouchableOpacity
              style={styles.openMapsButton}
              onPress={() =>
                openGoogleMapsApp(
                  selectedLocation.latitude,
                  selectedLocation.longitude,
                  selectedLocation.hospitalName
                )
              }
            >
              <LinearGradient
                colors={["#34A853", "#2D8E47"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.openMapsButtonText}>
                  🗺️ Open in Google Maps
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications List */}
        {nearbyNotifs.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateIcon}>💭</Text>
              <Text style={styles.emptyStateTitle}>All Clear!</Text>
              <Text style={styles.emptyStateText}>
                No active blood requests near you right now.
              </Text>
              <Text style={styles.emptyStateSubtext}>
                You'll be notified when someone nearby needs your help.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.notificationsContainer}>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {nearbyNotifs.length}{" "}
                {nearbyNotifs.length === 1 ? "Request" : "Requests"} Nearby
              </Text>
            </View>

            <FlatList
              data={nearbyNotifs}
              scrollEnabled={false}
              keyExtractor={(item, i) => item.id || String(i)}
              renderItem={({ item }) => (
                <View style={styles.notificationCard}>
                  <LinearGradient
                    colors={["rgba(196, 30, 58, 0.1)", "rgba(139, 0, 0, 0.05)"]}
                    style={styles.cardGradient}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentText}>URGENT</Text>
                      </View>
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceText}>
                          📍 {item._distanceKm?.toFixed(1)} km
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bloodGroupHeader}>
                      <View style={styles.bloodGroupCircle}>
                        <Text style={styles.bloodGroupLarge}>
                          {item.requesterBloodGroup}
                        </Text>
                      </View>
                      <View style={styles.requesterInfo}>
                        <Text style={styles.requesterName}>
                          {item.requesterName}
                        </Text>
                        <Text style={styles.requesterAge}>
                          Age: {item.requesterAge}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.hospitalInfo}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>🏥</Text>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Hospital</Text>
                          <Text style={styles.infoValue}>
                            {item.hospitalName}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>📍</Text>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Location</Text>
                          <Text style={styles.infoValue}>
                            {item.hospitalLocation}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.locationButton}
                        onPress={() => handleFindLocation(item)}
                      >
                        <LinearGradient
                          colors={["#007AFF", "#0051D5"]}
                          style={styles.buttonGradient}
                        >
                          <Text style={styles.locationButtonText}>
                            📍 Open in Maps
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dismissButtonWrapper}
                        onPress={() => dismissNotification(item.id)}
                        disabled={dismissing}
                      >
                        <LinearGradient
                          colors={["#DC3545", "#C82333"]}
                          style={styles.buttonGradient}
                        >
                          <Text style={styles.dismissButtonText}>
                            {dismissing ? "..." : "Dismiss"}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.helpBanner}>
                      <Text style={styles.helpIcon}>💡</Text>
                      <Text style={styles.helpText}>
                        Your donation can save a life today
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: "center",
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  mapContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C2C2C",
  },
  closeMapButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeMapText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "bold",
  },
  mapInfoCard: {
    backgroundColor: "#FFF5F5",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#C41E3A",
  },
  mapHospitalName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8B0000",
    marginBottom: 5,
  },
  mapAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  patientInfoBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  patientInfoText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  bloodGroupBadge: {
    backgroundColor: "#C41E3A",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bloodGroupText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  mapWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  map: {
    width: "100%",
    height: 250,
  },
  webMapPlaceholder: {
    height: 150,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  webMapIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  webMapText: {
    color: "#666",
    fontSize: 14,
  },
  openMapsButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#34A853",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  openMapsButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 320,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C2C2C",
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  notificationsContainer: {
    flex: 1,
  },
  countBadge: {
    backgroundColor: "#8B0000",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 20,
    shadowColor: "#8B0000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  countText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  notificationCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardGradient: {
    backgroundColor: "white",
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  urgentBadge: {
    backgroundColor: "#FF4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  urgentText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  distanceBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  distanceText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 12,
  },
  bloodGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  bloodGroupCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#C41E3A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    shadowColor: "#C41E3A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  bloodGroupLarge: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  requesterInfo: {
    flex: 1,
  },
  requesterName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C2C2C",
    marginBottom: 4,
  },
  requesterAge: {
    fontSize: 14,
    color: "#666",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 15,
  },
  hospitalInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: "#2C2C2C",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  locationButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  locationButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  dismissButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#DC3545",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  dismissButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  helpBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
  },
  helpIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: "#8B7500",
    fontStyle: "italic",
    fontWeight: "500",
  },
});
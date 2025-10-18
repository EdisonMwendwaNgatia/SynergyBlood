import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import hospitalsData from "../data/hospitals.json";

export default function DonateBloodScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationShared, setLocationShared] = useState(false);

  // Haversine distance in km
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleShareLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required to show nearby hospitals.");
        setLoading(false);
        return;
      }

      let loc = null;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 10000,
          timeout: 10000,
        });
      } catch (_e) {
        loc = await Location.getLastKnownPositionAsync();
      }

      if (!loc) {
        Alert.alert(
          "Location Unavailable",
          "Could not determine your position. Ensure you allowed location and are using https or localhost."
        );
        setLoading(false);
        return;
      }

      const { latitude, longitude } = loc.coords;
      setUserLocation({ latitude, longitude });
      setLocationShared(true);

      // Filter hospitals within 20 km
      const nearby = hospitalsData
        .map((h) => ({
          ...h,
          distanceKm: getDistance(latitude, longitude, h.latitude, h.longitude),
        }))
        .filter((h) => h.distanceKm <= 20)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      setNearbyHospitals(nearby);
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to fetch location.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInGoogleMaps = (lat, lng, name) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${lat},${lng}`
    )}&query_place_id=${encodeURIComponent(name || "Hospital")}`;
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Donate Blood — Find Nearby Hospitals</Text>

      {!locationShared ? (
        <View style={styles.center}>
          <Text style={styles.infoText}>
            Tap the button below to share your location and see hospitals near you.
          </Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareLocation}>
            <Text style={styles.shareText}>📍 Share My Location</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#b30000" />
          <Text style={{ marginTop: 8 }}>Finding nearby hospitals...</Text>
        </View>
      ) : (
        <>
          {userLocation && (
            <Text style={styles.subtle}>
              Your location: {userLocation.latitude.toFixed(5)},{" "}
              {userLocation.longitude.toFixed(5)}
            </Text>
          )}

          {nearbyHospitals.length === 0 ? (
            <Text style={{ textAlign: "center", marginVertical: 20 }}>
              No hospitals found within 20 km radius.
            </Text>
          ) : (
            <FlatList
              data={nearbyHospitals}
              keyExtractor={(item) =>
                String(item.id ?? `${item.latitude}-${item.longitude}`)
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.hospitalCard,
                    selectedHospital?.id === item.id && { backgroundColor: "#ffe6e6" },
                  ]}
                  onPress={() => setSelectedHospital(item)}
                >
                  <Text style={styles.hospitalName}>{item.name}</Text>
                  <Text>{item.address}</Text>
                  {typeof item.distanceKm === "number" ? (
                    <Text style={styles.subtle}>
                      {item.distanceKm.toFixed(1)} km away
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.openMapsBtn}
                    onPress={() =>
                      handleOpenInGoogleMaps(
                        item.latitude,
                        item.longitude,
                        item.name
                      )
                    }
                  >
                    <Text style={styles.openMapsText}>Open in Google Maps</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}

          {selectedHospital && (
            <View style={styles.selectedCard}>
              <Text style={styles.selectedTitle}>Selected Hospital</Text>
              <Text style={styles.hospitalName}>{selectedHospital.name}</Text>
              <Text>{selectedHospital.address}</Text>
              <Text style={styles.subtle}>
                Lat: {selectedHospital.latitude}, Lng: {selectedHospital.longitude}
              </Text>

              <TouchableOpacity
                style={[styles.openMapsBtn, { marginTop: 12 }]}
                onPress={() =>
                  handleOpenInGoogleMaps(
                    selectedHospital.latitude,
                    selectedHospital.longitude,
                    selectedHospital.name
                  )
                }
              >
                <Text style={styles.openMapsText}>Open in Google Maps</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  title: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 20,
    color: "#b30000",
    fontWeight: "bold",
  },
  infoText: {
    textAlign: "center",
    marginBottom: 15,
    color: "#555",
    fontSize: 16,
  },
  shareBtn: {
    backgroundColor: "#b30000",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  shareText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  subtle: { color: "#6b7280", marginBottom: 8 },
  hospitalCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: 10,
  },
  hospitalName: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#b30000",
    marginBottom: 2,
  },
  selectedCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
  },
  selectedTitle: {
    fontSize: 18,
    marginBottom: 6,
    textAlign: "center",
  },
  openMapsBtn: {
    backgroundColor: "#b30000",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  openMapsText: { color: "#fff", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});

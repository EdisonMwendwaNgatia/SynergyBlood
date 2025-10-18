import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
  TouchableOpacity,
  Dimensions
} from "react-native";
import * as Location from "expo-location";
import { auth, db } from "../firebaseConfig";
import { ref, get, push, set } from "firebase/database";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function RequestBloodScreen() {
  const [userInfo, setUserInfo] = useState(null);
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalLocation, setHospitalLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  useEffect(() => {
    const fetchMedicalInfo = async () => {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not authenticated.");
        return;
      }

      try {
        const infoRef = ref(db, `users/${user.uid}/medicalInfo`);
        const snapshot = await get(infoRef);

        if (snapshot.exists()) {
          setUserInfo(snapshot.val());
        } else {
          Alert.alert("Error", "Please complete your medical info first.");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load user information.");
      }
    };

    fetchMedicalInfo();
  }, []);

  const handleGetLocation = async () => {
    setDetecting(true);
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        setDetecting(false);
        return Alert.alert("Permission Denied", "Location access is required.");
      }

      let loc = null;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 10000,
          timeout: 15000,
        });
      } catch (_e) {
        loc = await Location.getLastKnownPositionAsync();
      }

      if (!loc) {
        const webNote =
          Platform.OS === "web"
            ? "\nTip: On web, ensure you're on https or localhost and allow location in the browser."
            : "";
        Alert.alert(
          "Location Unavailable",
          "Could not determine your position. Please ensure location services are enabled and try again." + webNote
        );
        setDetecting(false);
        return;
      }

      const { latitude: lat, longitude: lon } = loc.coords;
      setLatitude(Number(lat).toFixed(6));
      setLongitude(Number(lon).toFixed(6));

      setDetecting(false);
      Alert.alert("Success", "GPS location captured!");
    } catch (err) {
      setDetecting(false);
      Alert.alert("Error", err?.message || "Failed to retrieve GPS location.");
    }
  };

  const handleSendNotification = async () => {
    if (!hospitalName || !hospitalLocation || !latitude || !longitude) {
      return Alert.alert("Error", "Please fill all fields and capture your location first.");
    }
    if (!userInfo) {
      return Alert.alert("Error", "User info not found.");
    }

    const user = auth.currentUser;
    if (!user) {
      return Alert.alert("Error", "User not authenticated.");
    }

    setLoading(true);
    try {
      const notificationsRef = ref(db, "notifications");
      const newNotificationRef = push(notificationsRef);
      
      const notificationData = {
        title: "Blood Request",
        requesterId: user.uid,
        requesterName: userInfo.fullName || "Unknown",
        requesterBloodGroup: userInfo.bloodGroup || "Unknown",
        requesterAge: userInfo.age || "Unknown",
        requesterGender: userInfo.gender || "Unknown",
        requesterAvailability: userInfo.availableToDonate || false,
        hospitalName: hospitalName.trim(),
        hospitalLocation: hospitalLocation.trim(),
        requesterCoords: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        status: "active",
        timestamp: Date.now(),
        notificationId: newNotificationRef.key,
      };

      await set(newNotificationRef, notificationData);

      setLoading(false);
      Alert.alert("Success", "Blood request sent successfully!");
      
      setHospitalName("");
      setHospitalLocation("");
      setLatitude("");
      setLongitude("");
      
    } catch (err) {
      setLoading(false);
      console.error("Error sending notification:", err);
      Alert.alert("Error", err.message || "Failed to send blood request. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#8B0000', '#C41E3A', '#8B0000']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Processing your request...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={['#8B0000', '#C41E3A', '#8B0000']}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>💉</Text>
            </View>
            <Text style={styles.headerTitle}>Request Blood</Text>
            <Text style={styles.headerSubtitle}>Help is on the way</Text>
          </View>

          {/* User Info Card */}
          {userInfo ? (
            <View style={styles.userInfoCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderText}>Your Information</Text>
                <View style={styles.bloodTypeBadge}>
                  <Text style={styles.bloodTypeText}>{userInfo.bloodGroup}</Text>
                </View>
              </View>
              
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{userInfo.fullName}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Age</Text>
                  <Text style={styles.infoValue}>{userInfo.age}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>{userInfo.gender || "Not specified"}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Donor Status</Text>
                  <View style={[styles.statusBadge, userInfo.availableToDonate && styles.statusBadgeActive]}>
                    <Text style={styles.statusText}>
                      {userInfo.availableToDonate ? "Available" : "Not Available"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.loadingUserInfo}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loadingUserText}>Loading user info...</Text>
            </View>
          )}

          {/* Request Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Hospital Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Hospital Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                placeholder="Enter hospital name"
                placeholderTextColor="#999"
                value={hospitalName}
                onChangeText={setHospitalName}
                onFocus={() => setFocusedInput('hospital')}
                onBlur={() => setFocusedInput(null)}
                style={[
                  styles.input,
                  focusedInput === 'hospital' && styles.inputFocused
                ]}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Hospital Location <Text style={styles.required}>*</Text></Text>
              <TextInput
                placeholder="Enter hospital location"
                placeholderTextColor="#999"
                value={hospitalLocation}
                onChangeText={setHospitalLocation}
                onFocus={() => setFocusedInput('location')}
                onBlur={() => setFocusedInput(null)}
                style={[
                  styles.input,
                  focusedInput === 'location' && styles.inputFocused
                ]}
              />
            </View>

            {/* GPS Location Section */}
            <Text style={styles.sectionTitle}>Your Current Location</Text>
            
            <View style={styles.coordsContainer}>
              <View style={styles.coordInput}>
                <Text style={styles.coordLabel}>Latitude</Text>
                <TextInput
                  placeholder="0.000000"
                  placeholderTextColor="#999"
                  value={latitude}
                  editable={false}
                  style={styles.coordField}
                />
              </View>
              <View style={styles.coordInput}>
                <Text style={styles.coordLabel}>Longitude</Text>
                <TextInput
                  placeholder="0.000000"
                  placeholderTextColor="#999"
                  value={longitude}
                  editable={false}
                  style={styles.coordField}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.locationButton, detecting && styles.locationButtonDisabled]}
              onPress={handleGetLocation}
              disabled={detecting}
              activeOpacity={0.8}
            >
              <Text style={styles.locationButtonText}>
                {detecting ? "📍 Detecting Location..." : "📍 Get Current Location"}
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!hospitalName || !hospitalLocation || !latitude || !longitude) && styles.submitButtonDisabled
              ]}
              onPress={handleSendNotification}
              disabled={!hospitalName || !hospitalLocation || !latitude || !longitude}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#C41E3A', '#8B0000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>Send Blood Request</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.helperText}>
              All fields marked with * are required
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 15,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconText: {
    fontSize: 36,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
  userInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cardHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  bloodTypeBadge: {
    backgroundColor: '#C41E3A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bloodTypeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#2C2C2C',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeActive: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 20,
  },
  loadingUserText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontSize: 14,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 15,
    marginTop: 5,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  required: {
    color: '#C41E3A',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
    color: '#2C2C2C',
  },
  inputFocused: {
    borderColor: '#C41E3A',
    backgroundColor: '#FFF',
  },
  coordsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  coordInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  coordLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  coordField: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    backgroundColor: '#F5F5F5',
    color: '#666',
  },
  locationButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#C41E3A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 25,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    color: '#C41E3A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  helperText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
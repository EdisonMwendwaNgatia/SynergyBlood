import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ref, get, set } from "firebase/database";
import { auth, db } from "../firebaseConfig";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from 'expo-linear-gradient';

export default function AddInfoScreen() {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [allergy, setAllergy] = useState("");
  const [disease, setDisease] = useState("");
  const [availableToDonate, setAvailableToDonate] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const userId = auth.currentUser?.uid;

  // Fetch existing user info
  useEffect(() => {
    if (!userId) return;
    const userRef = ref(db, `users/${userId}/medicalInfo`);
    get(userRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setFullName(data.fullName || "");
          setAge(data.age || "");
          setGender(data.gender || "");
          setBloodGroup(data.bloodGroup || "");
          setLocation(data.location || "");
          setLatitude(data.latitude || "");
          setLongitude(data.longitude || "");
          setAllergy(data.allergy || "");
          setDisease(data.disease || "");
          setAvailableToDonate(data.availableToDonate || false);
        }
      })
      .catch(() => Alert.alert("Error", "Failed to load information."));
  }, [userId]);

  // Fetch GPS coordinates
  const fetchGpsLocation = async () => {
    setDetecting(true);
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
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
        const webNote =
          Platform.OS === "web"
            ? "\nTip: On web, ensure you're on https or localhost and allow location in the browser."
            : "";
        Alert.alert(
          "Location Unavailable",
          "Could not determine your position. Please ensure location services are enabled and try again." + webNote
        );
        return;
      }

      const { latitude: lat, longitude: lon } = loc.coords;
      setLatitude(Number(lat).toFixed(6));
      setLongitude(Number(lon).toFixed(6));

      Alert.alert("GPS Location Set", `Latitude: ${lat}, Longitude: ${lon}`);
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to retrieve GPS location.");
    } finally {
      setDetecting(false);
    }
  };

  // Save or update user info
  const handleSave = async () => {
    if (!fullName || !age || !bloodGroup || !gender) {
      Alert.alert("Missing Info", "Please fill in all required fields.");
      return;
    }

    const userRef = ref(db, `users/${userId}/medicalInfo`);
    const info = {
      fullName,
      age,
      gender,
      bloodGroup,
      location,
      latitude,
      longitude,
      allergy,
      disease,
      availableToDonate,
      lastUpdated: new Date().toISOString(),
    };

    try {
      await set(userRef, info);
      Alert.alert("Success", "Information saved successfully.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B0000', '#C41E3A', '#8B0000']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>+</Text>
          </View>
          <Text style={styles.headerTitle}>Medical Information</Text>
          <Text style={styles.headerSubtitle}>Keep your profile up to date</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {/* Personal Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>Personal Details</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setFocusedInput('fullName')}
                onBlur={() => setFocusedInput(null)}
                style={[
                  styles.input,
                  focusedInput === 'fullName' && styles.inputFocused
                ]}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Age <Text style={styles.required}>*</Text></Text>
                <TextInput
                  placeholder="Age"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                  onFocus={() => setFocusedInput('age')}
                  onBlur={() => setFocusedInput(null)}
                  style={[
                    styles.input,
                    focusedInput === 'age' && styles.inputFocused
                  ]}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.label}>Gender <Text style={styles.required}>*</Text></Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={gender}
                    onValueChange={setGender}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select" value="" />
                    <Picker.Item label="Male" value="Male" />
                    <Picker.Item label="Female" value="Female" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Blood Group <Text style={styles.required}>*</Text></Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={bloodGroup}
                  onValueChange={setBloodGroup}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Blood Group" value="" />
                  <Picker.Item label="A+" value="A+" />
                  <Picker.Item label="A-" value="A-" />
                  <Picker.Item label="B+" value="B+" />
                  <Picker.Item label="B-" value="B-" />
                  <Picker.Item label="AB+" value="AB+" />
                  <Picker.Item label="AB-" value="AB-" />
                  <Picker.Item label="O+" value="O+" />
                  <Picker.Item label="O-" value="O-" />
                </Picker>
              </View>
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>Location Details</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location Address</Text>
              <TextInput
                placeholder="Enter your location"
                placeholderTextColor="#999"
                value={location}
                onChangeText={setLocation}
                onFocus={() => setFocusedInput('location')}
                onBlur={() => setFocusedInput(null)}
                style={[
                  styles.input,
                  focusedInput === 'location' && styles.inputFocused
                ]}
              />
            </View>

            <TouchableOpacity
              style={[styles.gpsButton, detecting && styles.gpsButtonDisabled]}
              onPress={fetchGpsLocation}
              disabled={detecting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={detecting ? ['#999', '#666'] : ['#C41E3A', '#8B0000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gpsButtonGradient}
              >
                <Text style={styles.gpsButtonIcon}>📍</Text>
                <Text style={styles.gpsButtonText}>
                  {detecting ? "Detecting Location..." : "Detect GPS Location"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  placeholder="Auto-filled"
                  placeholderTextColor="#999"
                  value={latitude}
                  editable={false}
                  style={styles.inputDisabled}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  placeholder="Auto-filled"
                  placeholderTextColor="#999"
                  value={longitude}
                  editable={false}
                  style={styles.inputDisabled}
                />
              </View>
            </View>
          </View>

          {/* Medical Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>Medical History</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Allergies</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={allergy}
                  onValueChange={setAllergy}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Allergy" value="" />
                  <Picker.Item label="None" value="None" />
                  <Picker.Item label="Penicillin" value="Penicillin" />
                  <Picker.Item label="Pollen" value="Pollen" />
                  <Picker.Item label="Food Allergies" value="Food Allergies" />
                  <Picker.Item label="Dust" value="Dust" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medical Conditions</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={disease}
                  onValueChange={setDisease}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Condition" value="" />
                  <Picker.Item label="None" value="None" />
                  <Picker.Item label="Diabetes" value="Diabetes" />
                  <Picker.Item label="Hypertension" value="Hypertension" />
                  <Picker.Item label="Hepatitis" value="Hepatitis" />
                  <Picker.Item label="HIV" value="HIV" />
                  <Picker.Item label="Malaria" value="Malaria" />
                </Picker>
              </View>
            </View>
          </View>

          {/* Donation Availability */}
          <View style={styles.donationCard}>
            <View style={styles.donationContent}>
              <View style={styles.donationIcon}>
                <Text style={styles.donationIconText}>💉</Text>
              </View>
              <View style={styles.donationTextContainer}>
                <Text style={styles.donationTitle}>Available to Donate</Text>
                <Text style={styles.donationSubtitle}>
                  Let others know you're ready to help
                </Text>
              </View>
            </View>
            <Switch 
              value={availableToDonate} 
              onValueChange={setAvailableToDonate} 
              trackColor={{ false: '#E0E0E0', true: '#C41E3A' }}
              thumbColor={availableToDonate ? '#FFF' : '#F4F3F4'}
              ios_backgroundColor="#E0E0E0"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#C41E3A', '#8B0000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>Save Information</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Your information is securely stored and only shared with authorized medical personnel in emergencies.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  iconText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    backgroundColor: '#C41E3A',
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
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
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#2C2C2C',
  },
  inputFocused: {
    borderColor: '#C41E3A',
    backgroundColor: '#FFF',
  },
  inputDisabled: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
    color: '#999',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#2C2C2C',
  },
  gpsButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  gpsButtonDisabled: {
    opacity: 0.6,
  },
  gpsButtonGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  donationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF5F5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFE0E0',
    marginBottom: 25,
  },
  donationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  donationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  donationIconText: {
    fontSize: 24,
  },
  donationTextContainer: {
    flex: 1,
  },
  donationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 2,
  },
  donationSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footerNote: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});
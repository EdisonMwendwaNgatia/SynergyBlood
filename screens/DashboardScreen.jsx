import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar 
} from 'react-native';
import { auth, db } from '../firebaseConfig'; // Changed from 'database' to 'db'
import { signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');
  const [userData, setUserData] = useState(null);
  const [medicalInfo, setMedicalInfo] = useState(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Get user name from email (before @)
    if (auth.currentUser?.email) {
      const name = auth.currentUser.email.split('@')[0];
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
      
      // Fetch user data from Firebase
      fetchUserData(auth.currentUser.uid);
    }

    // Cleanup function to remove listener
    return () => {
      if (auth.currentUser?.uid) {
        const userRef = ref(db, `users/${auth.currentUser.uid}`);
        onValue(userRef, () => {}); // This effectively removes the listener
      }
    };
  }, []);

  const fetchUserData = (userId) => {
    const userRef = ref(db, `users/${userId}`);
    
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserData(data);
        setMedicalInfo(data.medicalInfo || null);
      }
    }, (error) => {
      console.error('Error fetching user data:', error);
    });
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => {
            signOut(auth)
              .then(() => {
                navigation.replace("Login");
              })
              .catch((error) => {
                Alert.alert("Error", error.message);
              });
          }
        }
      ]
    );
  };

  const DashboardCard = ({ icon, title, subtitle, onPress, gradient }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>{icon}</Text>
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const QuickAction = ({ icon, label, onPress, color }) => (
    <TouchableOpacity 
      style={styles.quickActionButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Text style={styles.quickActionIconText}>{icon}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // Get availability status text and color
  const getAvailabilityInfo = () => {
    if (!medicalInfo) return { text: 'Not Set', color: '#666' };
    
    return medicalInfo.availableToDonate 
      ? { text: 'Available to Donate', color: '#2E8B57' }
      : { text: 'Not Available', color: '#DC143C' };
  };

  const availabilityInfo = getAvailabilityInfo();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#8B0000', '#C41E3A']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileCircle}
            onPress={handleLogout}
          >
            <Text style={styles.profileIcon}>⏻</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards with Database Data */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {medicalInfo?.bloodGroup || 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Blood Type</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: availabilityInfo.color }]}>
              {medicalInfo?.availableToDonate ? 'Yes' : 'No'}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {medicalInfo?.location ? 
                medicalInfo.location.length > 8 ? 
                  medicalInfo.location.substring(0, 8) + '...' : 
                  medicalInfo.location 
                : 'N/A'
              }
            </Text>
            <Text style={styles.statLabel}>Location</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction 
              icon="📝" 
              label="Add Info" 
              color="#FF6B6B"
              onPress={() => navigation.navigate('AddInfo')}
            />
            <QuickAction 
              icon="🔔" 
              label="Alerts" 
              color="#4ECDC4"
              onPress={() => navigation.navigate('Notifications')}
            />
          </View>
        </View>

        {/* Main Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Main Services</Text>
          
          <DashboardCard
            icon="🩸"
            title="Request Blood"
            subtitle="Find donors near you"
            gradient={['#FF6B6B', '#C41E3A']}
            onPress={() => navigation.navigate('RequestBlood')}
          />

          <DashboardCard
            icon="❤️"
            title="Donate Blood"
            subtitle="Save lives today"
            gradient={['#8B0000', '#6B0000']}
            onPress={() => navigation.navigate('DonateBlood')}
          />
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerIcon}>
            <Text style={styles.infoBannerIconText}>💡</Text>
          </View>
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Did you know?</Text>
            <Text style={styles.infoBannerText}>
              One blood donation can save up to 3 lives
            </Text>
          </View>
        </View>

        {/* Removed Logout Button from bottom as requested */}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#F5F5F5' 
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileIcon: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 24,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionIconText: {
    fontSize: 28,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: {
    padding: 24,
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconText: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
  },
  infoBannerIcon: {
    marginRight: 16,
  },
  infoBannerIconText: {
    fontSize: 32,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});
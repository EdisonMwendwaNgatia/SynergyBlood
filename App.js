import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig";

// Import screens
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import DashboardScreen from "./screens/DashboardScreen";
import AddInfoScreen from "./screens/AddInfoScreen";
import RequestBloodScreen from "./screens/RequestBloodScreen";
import DonateBloodScreen from "./screens/DonateBloodScreen";
import NotificationScreen from "./screens/NotificationScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, [initializing]);

  // Show a loading screen while checking auth state
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#b30000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#b30000" },
          headerTintColor: "#fff",
          headerTitleAlign: "center",
        }}
      >
        {user ? (
          // Authenticated screens
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ title: "Dashboard" }}
            />
            <Stack.Screen 
              name="AddInfo" 
              component={AddInfoScreen}
              options={{ title: "Medical Information" }}
            />
            <Stack.Screen 
              name="RequestBlood" 
              component={RequestBloodScreen}
              options={{ title: "Request Blood" }}
            />
            <Stack.Screen 
              name="DonateBlood" 
              component={DonateBloodScreen}
              options={{ title: "Donate Blood" }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationScreen}
              options={{ title: "Notifications" }}
            />
          </>
        ) : (
          // Unauthenticated screens
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ title: "Login" }}
            />
            <Stack.Screen 
              name="Signup" 
              component={SignupScreen}
              options={{ title: "Create Account" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
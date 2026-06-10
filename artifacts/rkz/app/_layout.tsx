import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as ScreenCapture from "expo-screen-capture";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { ConfigProvider } from "@/context/DynamicConfig";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 260,
        gestureEnabled: true,
        gestureDirection: "horizontal",
      }}
    >
      <Stack.Screen name="login"          options={{ animation: "fade", animationDuration: 220 }} />
      <Stack.Screen name="gate"           options={{ animation: "fade", animationDuration: 220, gestureEnabled: false }} />
      <Stack.Screen name="welcome"        options={{ animation: "fade", animationDuration: 220, gestureEnabled: false }} />
      <Stack.Screen name="(tabs)"         options={{ animation: "none" }} />
      <Stack.Screen name="admin-dashboard" options={{ presentation: "card",  animation: "slide_from_right" }} />
      <Stack.Screen name="admin"          options={{ presentation: "card",  animation: "slide_from_right" }} />
      <Stack.Screen name="investor-portal" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="leases"         options={{ presentation: "card",  animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    return () => { ScreenCapture.allowScreenCaptureAsync(); };
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ConfigProvider>
                <AppProvider>
                  <RootLayoutNav />
                </AppProvider>
              </ConfigProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

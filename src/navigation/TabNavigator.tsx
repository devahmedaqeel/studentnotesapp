import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { useTheme } from '../hooks/useTheme';
import { HomeScreen } from '../screens/HomeScreen';
import { SubjectsScreen } from '../screens/SubjectsScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 0);
  const tabBarHeight = 64 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.borderLight,
          height: tabBarHeight,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen as any}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Subjects"
        component={SubjectsScreen as any}
        options={{
          tabBarLabel: 'Subjects',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'folder-open' : 'folder-open-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScannerTab"
        component={ScannerScreen as any}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: () => (
            <View style={[styles.scanButton, { backgroundColor: theme.colors.primary, top: -14 }]}>
              <Ionicons name="camera" size={26} color="#FFFFFF" />
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            (navigation.getParent() as any)?.navigate('Scanner', {});
          },
        })}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen as any}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen as any}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});

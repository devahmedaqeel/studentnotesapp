try {
  console.log('Testing imports...');
  console.log('1. react');
  require('react');
  console.log('2. react-native');
  require('react-native');
  console.log('3. react-native-gesture-handler');
  require('react-native-gesture-handler');
  console.log('4. react-native-safe-area-context');
  require('react-native-safe-area-context');
  console.log('5. react-native-screens');
  require('react-native-screens');
  console.log('6. @react-navigation/native');
  require('@react-navigation/native');
  console.log('7. @react-navigation/native-stack');
  require('@react-navigation/native-stack');
  console.log('8. @react-navigation/bottom-tabs');
  require('@react-navigation/bottom-tabs');
  console.log('9. expo-camera');
  require('expo-camera');
  console.log('10. expo-sqlite');
  require('expo-sqlite');
  console.log('All imports succeeded!');
} catch (err) {
  console.error('Import error caught:', err);
}

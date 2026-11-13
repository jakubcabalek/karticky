// Must stay first: applies the phone's version choice before the app loads.
import './nativeRuntime';
import { createElement } from 'react';
import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import App from './App';

// The provider tells the app how much room the notch and home indicator take.
const Root = () => createElement(SafeAreaProvider, null, createElement(App));

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// it also sets up the environment for Expo Go and native builds alike.
registerRootComponent(Root);

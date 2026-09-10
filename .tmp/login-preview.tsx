import React from 'react';
import {createRoot} from 'react-dom/client';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppFontProvider} from '../apps/mobile/src/components/ui/app-text';
import {LoginScreen} from '../apps/mobile/src/features/auth/components/login-screen';
import {i18n} from '../apps/mobile/src/i18n';
i18n.changeLanguage(new URLSearchParams(location.search).get('lang') || 'en');
createRoot(document.getElementById('root')!).render(<SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:innerWidth,height:innerHeight},insets:{top:0,left:0,right:0,bottom:0}}}><AppFontProvider fontsAvailable><LoginScreen /></AppFontProvider></SafeAreaProvider>);

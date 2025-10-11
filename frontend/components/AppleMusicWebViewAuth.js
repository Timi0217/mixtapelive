import React, { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import webViewMusicKitService from '../services/webViewMusicKitService';
import nativeMusicKitService from '../services/nativeMusicKitService';

// Configure WebBrowser for OAuth completion
WebBrowser.maybeCompleteAuthSession();

const AppleMusicWebViewAuth = ({ visible, onSuccess, onError, onCancel }) => {

  useEffect(() => {
    if (visible) {
      startAuthentication();
    }
  }, [visible]);

  const startAuthentication = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🖥️ Starting Apple Music desktop sync authentication...');
      }
      
      // Show desktop sync instructions instead of complex web auth
      const desktopAuthUrl = `https://mixtape-production.up.railway.app/api/oauth/apple/desktop-auth`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Opening Apple Music desktop auth:', desktopAuthUrl);
      }
      
      // Listen for deep link response
      const handleDeepLink = (url) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔗 Received deep link:', url);
          console.log('🔍 DEBUG: Deep link analysis:', {
            timestamp: new Date().toISOString(),
            fullUrl: url,
            isAppleMusicSuccess: url.includes('apple-music-success'),
            isAppleMusicError: url.includes('error='),
            urlLength: url.length
          });
        }
        
        if (url.includes('apple-music-success')) {
          try {
            const urlObj = new URL(url);
            const token = urlObj.searchParams.get('token');
            const error = urlObj.searchParams.get('error');
            
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 DEBUG: URL parameters:', {
                hasToken: !!token,
                tokenLength: token?.length || 0,
                hasError: !!error,
                errorValue: error,
                allParams: Object.fromEntries(urlObj.searchParams.entries())
              });
            }
            
            if (token) {
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Received Apple Music token from deep link');
                console.log('🔍 DEBUG: Token details:', {
                  length: token.length,
                  preview: token.substring(0, 50) + '...'
                });
              }
              handleTokenReceived(token);
            } else if (error) {
              console.error('❌ Received error from deep link:', error);
              onError(error);
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.error('❌ No token received in callback');
                console.log('🔍 DEBUG: No token or error in URL params');
              }
              onError('Apple Music authentication failed - no token received');
            }
          } catch (urlParseError) {
            console.error('Failed to parse deep link URL:', urlParseError);
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 DEBUG: URL parse error:', {
                error: urlParseError.message,
                url: url
              });
            }
            onError('Failed to parse authentication response');
          }
        }
      };
      
      // Set up deep link listener
      const subscription = Linking.addEventListener('url', handleDeepLink);
      
      // Use Linking.openURL to open desktop auth page in Safari
      await Linking.openURL(desktopAuthUrl);
      
      // Don't remove listener immediately - wait for deep link
      setTimeout(() => {
        subscription?.remove();
        if (process.env.NODE_ENV === 'development') {
          console.log('🔗 Deep link listener removed after timeout');
        }
      }, 60000); // 1 minute timeout

    } catch (error) {
      console.error('❌ Auth failed:', error);
      onError(error.message);
    }
  };

  const handleTokenReceived = async (userToken) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Exchanging token with backend...');
        console.log('🔍 DEBUG: Token received in component:', {
          timestamp: new Date().toISOString(),
          tokenExists: !!userToken,
          tokenLength: userToken?.length || 0,
          tokenPreview: userToken?.substring(0, 30) + '...',
          source: 'handleTokenReceived'
        });
      }
      
      const exchangeResult = await webViewMusicKitService.exchangeTokenWithBackend(userToken);
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 DEBUG: Exchange result:', {
          success: exchangeResult.success,
          hasToken: !!exchangeResult.token,
          hasUser: !!exchangeResult.user,
          platform: exchangeResult.platform
        });
      }
      onSuccess(exchangeResult);
    } catch (error) {
      console.error('Token exchange failed:', error);
      if (process.env.NODE_ENV === 'development') {
        console.error('🔍 DEBUG: Component-level error:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      onError(error.message);
    }
  };


  // Return null - no UI needed, just handle the auth flow
  return null;
};

export default AppleMusicWebViewAuth;
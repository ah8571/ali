import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';

import { loginUser, loginWithSocialProvider, registerUser } from '../services/api.js';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedRequiredTerms, setAcceptedRequiredTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
    const loadAppleAvailability = async () => {
      if (Platform.OS !== 'ios') {
        setAppleAuthAvailable(false);
        return;
      }

      const available = await AppleAuthentication.isAvailableAsync();
      setAppleAuthAvailable(available);
    };

    loadAppleAvailability();
  }, []);

  const completeSocialLogin = async ({ provider, idToken, socialEmail = null, socialFullName = null }) => {
    if (!acceptedRequiredTerms) {
      setError('You must agree to the Terms of Use and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await loginWithSocialProvider({
        provider,
        idToken,
        email: socialEmail,
        fullName: socialFullName,
        marketingOptIn,
        termsAccepted: acceptedRequiredTerms,
        privacyAccepted: acceptedRequiredTerms
      });

      if (!response.success) {
        setError(response.error || `${provider} sign-in failed`);
        return;
      }

      onLoginSuccess(response.user);
    } catch (err) {
      setError(err.message || `${provider} sign-in failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      if (!isLogin && !acceptedRequiredTerms) {
        setError('You must agree to the Terms of Use and Privacy Policy to create an account.');
        setLoading(false);
        return;
      }

      const response = isLogin
        ? await loginUser(email.trim().toLowerCase(), password)
        : await registerUser(email.trim().toLowerCase(), password, {
            marketingOptIn,
            termsAccepted: acceptedRequiredTerms,
            privacyAccepted: acceptedRequiredTerms
          });

      if (!response.success) {
        setError(response.error || 'Authentication failed');
        return;
      }

      onLoginSuccess(response.user);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    if (!appleAuthAvailable) {
      Alert.alert('Apple Sign In unavailable', 'Apple Sign In is only available on supported iOS builds.');
      return;
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL
        ]
      });

      if (!credential.identityToken) {
        setError('Apple did not return an identity token.');
        return;
      }

      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ') || null;

      await completeSocialLogin({
        provider: 'apple',
        idToken: credential.identityToken,
        socialEmail: credential.email || null,
        socialFullName: fullName
      });
    } catch (err) {
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }

      setError(err.message || 'Apple sign-in failed');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Emmaline</Text>
          <Text style={styles.subtitle}>Voice Assistant</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.socialGroup}>
            {appleAuthAvailable ? (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton, loading && styles.buttonDisabled]}
                onPress={handleAppleAuth}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-apple" size={18} color="#050607" />
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.socialButton, styles.buttonDisabled]}
              onPress={() => Alert.alert('Google Sign In unavailable', 'Google sign-in is temporarily disabled in this local test build until the Android client ID is configured.')}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color="#050607" />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separatorRow}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>or use email</Text>
            <View style={styles.separatorLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8f98a3"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <View style={styles.passwordField}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#8f98a3"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword((current) => !current)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#b0b7c0"
              />
            </TouchableOpacity>
          </View>

          {!isLogin ? (
            <View style={styles.consentGroup}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAcceptedRequiredTerms((current) => !current)}
                activeOpacity={0.85}
                disabled={loading}
              >
                <View style={[styles.checkbox, acceptedRequiredTerms && styles.checkboxChecked]}>
                  {acceptedRequiredTerms ? <Ionicons name="checkmark" size={14} color="#050607" /> : null}
                </View>
                <Text style={styles.checkboxText}>
                  I agree to the{' '}
                  <Text
                    style={styles.inlineLinkText}
                    onPress={() => navigation.navigate('TermsOfService')}
                  >
                    Terms of Use
                  </Text>
                  {' '}and{' '}
                  <Text
                    style={styles.inlineLinkText}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setMarketingOptIn((current) => !current)}
                activeOpacity={0.85}
                disabled={loading}
              >
                <View style={[styles.checkbox, marketingOptIn && styles.checkboxChecked]}>
                  {marketingOptIn ? <Ionicons name="checkmark" size={14} color="#050607" /> : null}
                </View>
                <Text style={styles.checkboxText}>[optional] I would like to receive an educational newsletter and product updates from Emmaline.</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#050607" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsLogin(!isLogin);
              setError('');
              setAcceptedRequiredTerms(false);
              setMarketingOptIn(false);
            }}
            disabled={loading}
          >
            <Text style={styles.toggleText}>
              {isLogin
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hands-free AI assistant for multitasking</Text>
          <Text style={styles.footerSubtext}>Call, talk, and organize your thoughts</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050607'
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  header: {
    alignItems: 'center',
    marginTop: 20
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f5f7fa',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#b0b7c0'
  },
  form: {
    marginVertical: 32
  },
  socialGroup: {
    gap: 12,
    marginBottom: 20
  },
  socialButton: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: '#f5f7fa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16
  },
  appleButton: {
    backgroundColor: '#ffffff'
  },
  socialButtonText: {
    color: '#050607',
    fontSize: 15,
    fontWeight: '700'
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(245, 247, 250, 0.16)'
  },
  separatorText: {
    color: '#8f98a3',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  input: {
    backgroundColor: '#050607',
    borderWidth: 1,
    borderColor: '#f5f7fa',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 14,
    color: '#f5f7fa'
  },
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050607',
    borderWidth: 1,
    borderColor: '#f5f7fa',
    borderRadius: 10,
    marginBottom: 12,
    paddingLeft: 16
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 12,
    fontSize: 14,
    color: '#f5f7fa'
  },
  passwordToggle: {
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  errorText: {
    color: '#ff9aa8',
    fontSize: 12,
    marginBottom: 12,
    fontWeight: '500'
  },
  consentGroup: {
    gap: 12,
    marginBottom: 4
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f5f7fa',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxChecked: {
    backgroundColor: '#f5f7fa'
  },
  checkboxText: {
    flex: 1,
    color: '#d6dbe1',
    fontSize: 12,
    lineHeight: 18
  },
  inlineLinkText: {
    color: '#f5f7fa',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  linkText: {
    color: '#f5f7fa',
    fontSize: 12,
    fontWeight: '600'
  },
  button: {
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#050607',
    fontSize: 16,
    fontWeight: '600'
  },
  toggleText: {
    color: '#f5f7fa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12
  },
  footer: {
    alignItems: 'center'
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f5f7fa',
    marginBottom: 4
  },
  footerSubtext: {
    fontSize: 12,
    color: '#b0b7c0'
  }
});

export default LoginScreen;

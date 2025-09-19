import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, Alert, KeyboardAvoidingView, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { storage } from '../lib/storage';
import { getApiBaseUrl } from '../lib/config';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    setIsLoading(true);

    try {
      // Get the API endpoint based on environment
      const getApiUrl = () => `${getApiBaseUrl()}/api/auth`;

      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        await storage.setItem('schoolme_authenticated', 'true');
        await storage.setItem('schoolme_auth_time', Date.now().toString());
        onLogin();
      } else {
        Alert.alert('Access Denied', data.message || 'Invalid password');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Logo/Title */}
        <View style={styles.header}>
          <MaterialIcons name="school" size={80} color="#ffffff" />
          <Text style={styles.title}>SchoolMe</Text>
          <Text style={styles.subtitle}>AI-Powered Learning Assistant</Text>
        </View>

        {/* Login Form */}
        <View style={styles.loginForm}>
          <Text style={styles.loginTitle}>Enter Access Code</Text>
          <Text style={styles.loginSubtitle}>
            Please enter the access code to continue
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Access Code"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton} activeOpacity={0.7}>
              <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <Button
            onPress={handleLogin}
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            textStyle={styles.loginButtonText}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.loginButtonText}>Authenticating...</Text>
            ) : (
              <View style={styles.buttonContent}>
                <MaterialIcons name="login" size={20} color="#000000" />
                <Text style={[styles.loginButtonText, { marginLeft: 8 }]}>
                  Enter
                </Text>
              </View>
            )}
          </Button>
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <MaterialIcons name="security" size={16} color="#9ca3af" />
          <Text style={styles.securityText}>
            This application is protected to ensure secure access
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 48 : 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  loginForm: {
    width: '100%',
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  loginButton: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    borderWidth: 2,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 48,
  },
  loginButtonDisabled: {
    backgroundColor: '#6b7280',
    borderColor: '#6b7280',
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.7,
  },
  securityText: {
    color: '#9ca3af',
    fontSize: 12,
    marginLeft: 8,
    textAlign: 'center',
  },
});

export default LoginScreen;

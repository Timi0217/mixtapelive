import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast from './Toast';
import toastService from '../services/toastService';

const ToastProvider = ({ children }) => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [toastDuration, setToastDuration] = useState(3000);

  useEffect(() => {
    // Register show toast callback
    toastService.setShowToast((message, type, duration) => {
      setToastMessage(message);
      setToastType(type);
      setToastDuration(duration);
      setToastVisible(true);
    });
  }, []);

  const handleHide = () => {
    setToastVisible(false);
  };

  return (
    <View style={styles.container}>
      {children}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={toastDuration}
        onHide={handleHide}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ToastProvider;

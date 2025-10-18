import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NotificationCard({ title, message, time }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title || 'Notification'}</Text>
      <Text style={styles.message}>{message || 'No message.'}</Text>
      {time ? <Text style={styles.time}>{time}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  message: { marginTop: 6, fontSize: 14, color: '#334155' },
  time: { marginTop: 8, fontSize: 12, color: '#64748b' },
});

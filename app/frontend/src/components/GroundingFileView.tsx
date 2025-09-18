import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GroundingFile } from '../types';

interface GroundingFileViewProps {
  file: GroundingFile | null;
  onClose: () => void;
}

const GroundingFileView: React.FC<GroundingFileViewProps> = ({ file, onClose }) => {
  if (!file) {
    return null;
  }

  return (
    <Modal
      visible={!!file}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {file.name}
          </Text>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={true}>
          <View style={styles.textContainer}>
            <Text style={styles.content}>
              {file.content}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 20,
  },
  contentContainer: {
    flex: 1,
  },
  textContainer: {
    padding: 20,
  },
  content: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default GroundingFileView;

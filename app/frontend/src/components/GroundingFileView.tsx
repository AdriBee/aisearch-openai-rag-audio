import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GroundingFile } from '../types';

interface GroundingFileViewProps {
  file: GroundingFile | null;
  onClose: () => void;
}

const GroundingFileView: React.FC<GroundingFileViewProps> = ({ file, onClose }) => {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const isMobile = screenData.width < 768;

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  if (!file) {
    return null;
  }

  const styles = createStyles(isMobile);

  return (
    <Modal
      visible={!!file}
      animationType="slide"
      presentationStyle={isMobile ? "fullScreen" : "pageSheet"}
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
            <MaterialIcons name="close" size={isMobile ? 20 : 24} color="#ffffff" />
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

const createStyles = (isMobile: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: isMobile ? (Platform.OS === 'web' ? 0 : 20) : (Platform.OS === 'ios' ? 50 : 20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobile ? 12 : 20,
    paddingVertical: isMobile ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    backgroundColor: '#000000',
    minHeight: isMobile ? 60 : 70,
  },
  title: {
    color: '#ffffff',
    fontSize: isMobile ? 14 : 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: isMobile ? 8 : 16,
  },
  closeButton: {
    padding: isMobile ? 12 : 8,
    backgroundColor: '#374151',
    borderRadius: 20,
    minWidth: isMobile ? 44 : 40,
    minHeight: isMobile ? 44 : 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#111111',
  },
  textContainer: {
    padding: isMobile ? 12 : 20,
  },
  content: {
    color: '#ffffff',
    fontSize: isMobile ? 12 : 16,
    lineHeight: isMobile ? 18 : 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default GroundingFileView;

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GroundingFile as GroundingFileType } from '../types';

interface GroundingFileProps {
  file: GroundingFileType;
  onPress: () => void;
}

const GroundingFile: React.FC<GroundingFileProps> = ({ file, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name="description" size={Platform.OS === 'web' ? 12 : 16} color="#ffffff" style={styles.icon} />
      <Text style={styles.fileName} numberOfLines={1}>
        {file.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: Platform.OS === 'web' ? 16 : 20,
    paddingHorizontal: Platform.OS === 'web' ? 8 : 12,
    paddingVertical: Platform.OS === 'web' ? 4 : 8,
    margin: Platform.OS === 'web' ? 2 : 4,
    minWidth: Platform.OS === 'web' ? 80 : 100,
    maxWidth: Platform.OS === 'web' ? 140 : 200,
  },
  icon: {
    marginRight: Platform.OS === 'web' ? 4 : 8,
  },
  fileName: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 10 : 14,
    fontWeight: '500',
    flex: 1,
  },
});

export default GroundingFile;

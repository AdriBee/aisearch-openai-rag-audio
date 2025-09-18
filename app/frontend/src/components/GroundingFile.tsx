import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GroundingFile as GroundingFileType } from '../types';

interface GroundingFileProps {
  file: GroundingFileType;
  onPress: () => void;
}

const GroundingFile: React.FC<GroundingFileProps> = ({ file, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name="description" size={16} color="#ffffff" style={styles.icon} />
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
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
    minWidth: 100,
  },
  icon: {
    marginRight: 8,
  },
  fileName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});

export default GroundingFile;

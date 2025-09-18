import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GroundingFile as GroundingFileType } from '../types';
import GroundingFile from './GroundingFile';

interface GroundingFilesProps {
  files: GroundingFileType[];
  onFileSelected: (file: GroundingFileType) => void;
}

const GroundingFiles: React.FC<GroundingFilesProps> = ({ files, onFileSelected }) => {
  const { t } = useTranslation();

  if (files.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('groundingFiles.title')}</Text>
        <Text style={styles.description}>{t('groundingFiles.description')}</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filesContainer}
      >
        {files.map((file, index) => (
          <GroundingFile
            key={`${file.id}-${index}`}
            file={file}
            onPress={() => onFileSelected(file)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: '#9ca3af',
    fontSize: 14,
  },
  filesContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
});

export default GroundingFiles;

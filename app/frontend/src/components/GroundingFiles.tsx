import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GroundingFile as GroundingFileType } from '../types';
import GroundingFile from './GroundingFile';

interface GroundingFilesProps {
  files: GroundingFileType[];
  onFileSelected: (file: GroundingFileType) => void;
}

const GroundingFiles: React.FC<GroundingFilesProps> = ({ files, onFileSelected }) => {
  const { t } = useTranslation();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const isMobile = screenData.width < 768;

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  if (files.length === 0) {
    return null;
  }

  const styles = createStyles(isMobile);

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

const createStyles = (isMobile: boolean) => StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: isMobile ? 8 : 12,
    padding: isMobile ? 8 : 16,
    width: '100%',
  },
  header: {
    marginBottom: isMobile ? 6 : 12,
  },
  title: {
    color: '#ffffff',
    fontSize: isMobile ? 12 : 18,
    fontWeight: 'bold',
    marginBottom: isMobile ? 2 : 4,
  },
  description: {
    color: '#9ca3af',
    fontSize: isMobile ? 10 : 14,
    display: isMobile ? 'none' : 'flex', // Hide description on mobile
  },
  filesContainer: {
    flexDirection: 'row',
    paddingVertical: isMobile ? 2 : 4,
  },
});

export default GroundingFiles;

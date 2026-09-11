import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';

import { Theme } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
};

export default function SearchBar({ value, onChangeText, placeholder = 'Rechercher...', style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <MaterialIcons name="search" size={18} color={Theme.colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Theme.colors.textMuted}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.textPrimary,
    padding: 0,
  },
});

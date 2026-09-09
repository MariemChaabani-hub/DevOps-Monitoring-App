import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../constants/theme';

/**
 * Alert.alert() replacement — react-native-web (~0.21, this project's
 * target for the localhost:8081 dev flow) does not render Alert.alert at
 * all: the call returns silently, no popup, no error, nothing in any
 * console. This modal works identically on web, iOS and Android since it's
 * plain RN components, not a platform-native API.
 */
export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onRequestClose: () => void;
};

export default function AlertModal({ visible, title, message, buttons, onRequestClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.buttonsColumn}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'cancel' && styles.cancelButton,
                  button.style === 'destructive' && styles.destructiveButton,
                ]}
                onPress={() => {
                  onRequestClose();
                  button.onPress?.();
                }}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'cancel' && styles.cancelButtonText,
                    button.style === 'destructive' && styles.destructiveButtonText,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  message: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.lg,
    lineHeight: 20,
  },
  buttonsColumn: {
    gap: Theme.spacing.sm,
  },
  button: {
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    backgroundColor: Theme.colors.accent,
  },
  cancelButton: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  destructiveButton: {
    backgroundColor: Theme.colors.danger,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  cancelButtonText: {
    color: Theme.colors.textSecondary,
  },
  destructiveButtonText: {
    color: Theme.colors.textPrimary,
  },
});

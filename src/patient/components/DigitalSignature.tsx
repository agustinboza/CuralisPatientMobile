import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { COLORS, SPACING, BORDER_RADIUS } from '../../shared/constants';

interface DigitalSignatureProps {
  onSignatureComplete: (signatureData: string) => void;
  onClear?: () => void;
  isProcessing?: boolean;
}

const { width } = Dimensions.get('window');
const SIGNATURE_WIDTH = width - SPACING.lg * 2;
const SIGNATURE_HEIGHT = 200;
const STROKE_WIDTH = 3;

// Pre-computed border/grid around the signature area so it isn't re-built on
// every render. This also makes the JSX a little tidier.
const GRID_PATH = `M 0 0 L ${SIGNATURE_WIDTH} 0 M 0 ${SIGNATURE_HEIGHT} L ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT} M 0 0 L 0 ${SIGNATURE_HEIGHT} M ${SIGNATURE_WIDTH} 0 L ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}`;

export const DigitalSignature: React.FC<DigitalSignatureProps> = ({
  onSignatureComplete,
  onClear,
  isProcessing = false,
}) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [hasSignature, setHasSignature] = useState(false);
  const pathRef = useRef('');

  /**
   * Accumulates points while the gesture is active (finger on the screen)
   * so they render in real-time. We purposefully DO NOT start a path here –
   * that is handled in `handleStateChange` when the gesture actually begins
   * (State.BEGAN). This separation guarantees that when the finger lifts
   * (State.END) we can close the current path and store it without it
   * bleeding into the next stroke.
   */
  const handleGestureEvent = useCallback(({ nativeEvent }: PanGestureHandlerGestureEvent) => {
    const { x, y } = nativeEvent;
    // If for some reason we receive events before a path was started just ignore them
    if (!pathRef.current) {
      return;
    }

    // Append current point to the path
    pathRef.current += ` L${x},${y}`;
    setCurrentPath(pathRef.current);
  }, []);

  /**
   * Handles state changes (BEGAN / END). This is where a path starts and ends
   * ensuring individual strokes remain isolated.
   */
  const handleStateChange = useCallback(({ nativeEvent }: PanGestureHandlerStateChangeEvent) => {
    const { state, x, y } = nativeEvent;

    if (state === State.BEGAN) {
      // Start a brand-new path for this stroke
      pathRef.current = `M${x},${y}`;
      setCurrentPath(pathRef.current);

      if (!hasSignature) {
        setHasSignature(true);
      }
    }

    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      if (pathRef.current) {
        // Persist the finished stroke
        const pathToSave = pathRef.current; // capture before clearing
        setPaths(prev => [...prev, pathToSave]);
        pathRef.current = '';
        setCurrentPath('');
      }
    }
  }, [hasSignature]);

  const clearSignature = () => {
    setPaths([]);
    setCurrentPath('');
    pathRef.current = ''; 
    setHasSignature(false);
    onClear?.();
  };

  const saveSignature = () => {
    if (!hasSignature) {
      Alert.alert('No Signature', 'Please provide your signature before continuing.');
      return;
    }

    const finalPaths = pathRef.current ? [...paths, pathRef.current] : paths;

    if (finalPaths.length === 0) {
      Alert.alert('No Signature', 'Please draw your signature before saving.');
      return;
    }

    const signatureData = JSON.stringify({
      paths: finalPaths,
      timestamp: new Date().toISOString(),
      dimensions: { width: SIGNATURE_WIDTH, height: SIGNATURE_HEIGHT },
    });
    
    onSignatureComplete(signatureData);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Digital Consent Signature</Text>
        <Text style={styles.subtitle}>
          Please sign below to provide your consent for medical data processing
        </Text>
      </View>

      <View style={styles.signatureContainer}>
        <View style={styles.signatureBox}>
          {!hasSignature && (
            <Text style={styles.placeholderText}>
              Sign here with your finger
            </Text>
          )}

          <Svg width={SIGNATURE_WIDTH} height={SIGNATURE_HEIGHT}>
            <Path d={GRID_PATH} stroke={COLORS.border} strokeWidth={1} fill="none" />
            
            {paths.map((path, index) => (
              <Path
                key={index}
                d={path}
                stroke={COLORS.primary}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            
            {currentPath && (
              <Path
                d={currentPath}
                stroke={COLORS.primary}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
          
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleStateChange}
          >
            <View style={styles.gestureArea} />
          </PanGestureHandler>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.clearButton,
            (!hasSignature || isProcessing) && styles.disabledButton,
          ]}
          onPress={clearSignature}
          disabled={!hasSignature || isProcessing}
        >
          <Text
            style={[styles.buttonText, (!hasSignature || isProcessing) && styles.disabledText]}
          >
            Clear
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            !hasSignature && styles.disabledButton,
          ]}
          onPress={saveSignature}
          disabled={!hasSignature || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                styles.saveButtonText,
                !hasSignature && styles.disabledText,
              ]}
            >
              Save Signature
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.consentText}>
        <Text style={styles.consentTitle}>Consent Agreement</Text>
        <Text style={styles.consentBody}>
          By signing above, I consent to the collection, processing, and storage of my medical data 
          for the purposes of my healthcare treatment and follow-up care. I understand that my data 
          will be processed securely and in accordance with applicable privacy laws.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  signatureContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  signatureBox: {
    position: 'relative',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gestureArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  placeholderText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    lineHeight: SIGNATURE_HEIGHT,
    fontSize: 18,
    color: COLORS.border,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  saveButtonText: {
    color: COLORS.background,
  },
  disabledText: {
    color: COLORS.textSecondary,
  },
  consentText: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  consentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  consentBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
}); 
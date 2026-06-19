import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PRIMARY = '#C8102E';

type HeartConfig = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  size: number;
  opacity: number;
  rotate: string;
};

const HEARTS: HeartConfig[] = [
  // Top area
  { top: 5,   right: 18,  size: 80, opacity: 0.13, rotate: '10deg'  },
  { top: 72,  right: -5,  size: 46, opacity: 0.11, rotate: '-20deg' },
  { top: 130, right: 60,  size: 28, opacity: 0.10, rotate: '6deg'   },
  { top: 18,  left: 20,   size: 36, opacity: 0.10, rotate: '-14deg' },
  { top: 100, left: -5,   size: 55, opacity: 0.12, rotate: '18deg'  },
  { top: 195, left: 85,   size: 22, opacity: 0.09, rotate: '-8deg'  },
  // Middle
  { top: 290, right: 8,   size: 65, opacity: 0.11, rotate: '15deg'  },
  { top: 340, left: 10,   size: 38, opacity: 0.10, rotate: '-25deg' },
  { top: 430, right: 72,  size: 26, opacity: 0.09, rotate: '5deg'   },
  { top: 470, left: 55,   size: 50, opacity: 0.11, rotate: '-12deg' },
  { top: 255, right: 95,  size: 30, opacity: 0.09, rotate: '22deg'  },
  { top: 380, left: -8,   size: 42, opacity: 0.10, rotate: '30deg'  },
  // Lower
  { bottom: 290, right: -5, size: 72, opacity: 0.12, rotate: '-16deg' },
  { bottom: 370, left: 15,  size: 44, opacity: 0.10, rotate: '14deg'  },
  { bottom: 210, left: 80,  size: 26, opacity: 0.09, rotate: '-5deg'  },
  { bottom: 150, right: 50, size: 58, opacity: 0.12, rotate: '8deg'   },
  { bottom: 80,  left: -5,  size: 36, opacity: 0.10, rotate: '-20deg' },
  { bottom: 28,  right: 110,size: 24, opacity: 0.10, rotate: '12deg'  },
  { bottom: 8,   left: 100, size: 46, opacity: 0.12, rotate: '-10deg' },
];

export function PatternDecor() {
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="none">
      {HEARTS.map((h, i) => (
        <Text
          key={i}
          style={[
            styles.heart,
            {
              fontSize: h.size,
              opacity: h.opacity,
              lineHeight: h.size * 1.15,
              transform: [{ rotate: h.rotate }],
              ...(h.top    !== undefined ? { top:    h.top    } : {}),
              ...(h.bottom !== undefined ? { bottom: h.bottom } : {}),
              ...(h.left   !== undefined ? { left:   h.left   } : {}),
              ...(h.right  !== undefined ? { right:  h.right  } : {}),
            },
          ]}
        >
          ♥
        </Text>
      ))}
    </View>
  );
}

export default function PatternBackground({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.root, style]}>
      <PatternDecor />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  heart: {
    position: 'absolute',
    color: PRIMARY,
  },
});

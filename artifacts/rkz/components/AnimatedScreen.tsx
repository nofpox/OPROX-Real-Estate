import React from "react";
import Animated, { FadeIn } from "react-native-reanimated";

interface Props {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

export default function AnimatedScreen({ children, delay = 0, duration = 280 }: Props) {
  return (
    <Animated.View
      style={{ flex: 1 }}
      entering={FadeIn.delay(delay).duration(duration)}
    >
      {children}
    </Animated.View>
  );
}

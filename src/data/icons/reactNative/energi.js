//@flow
import React from "react";
import Svg, { Path } from "react-native-svg";

type Props = {
  size: number,
  color: string
};

export default function Energi({ size, color }: Props) {
  return (
    <Svg viewBox="0 0 256 256" width={size} height={size}>
      <Path
        fill={color}
        d="M128 21.934L21.934 128 128 234.066 234.066 128l-24.042-24.042-83.438 83.439L67.189 128l58.69-58.69 17.677 17.678-40.305 40.305 23.335 23.334 65.054-65.053z"
      />
    </Svg>
  );
}
